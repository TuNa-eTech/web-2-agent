/**
 * MCP Streamable HTTP Transport (spec 2025-03-26)
 *
 * Each JSON-RPC call is a single POST request. The server may respond with:
 *   - Content-Type: application/json  → plain JSON-RPC response
 *   - Content-Type: text/event-stream → one or more SSE events, each carrying
 *     a JSON-RPC envelope. The response for the original request is matched
 *     by its `id`; other events may be server-initiated notifications.
 *
 * Session management (§Session Management):
 *   The server MAY include an `Mcp-Session-Id` response header on initialize.
 *   If present, all subsequent requests MUST echo it back.
 */
import type {
  McpCallToolResult,
  McpInitializeResult,
  McpListToolsResult,
} from "./types";
import { normalizeError } from "../utils/normalizeError";
import { extractJsonRpcFromSse, findJsonRpcResponse } from "./sseParser";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: string;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

export type HttpTransportOptions = {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type McpTransport = {
  initialize: () => Promise<McpInitializeResult>;
  notifyInitialized: () => Promise<void>;
  listTools: () => Promise<McpListToolsResult>;
  callTool: (toolName: string, input: unknown) => Promise<McpCallToolResult>;
};

const parseResponseBody = async (
  response: Response,
  requestId: string,
): Promise<JsonRpcResponse> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("text/event-stream")) {
    const text = await response.text();
    const envelopes = extractJsonRpcFromSse(text);
    const matched = findJsonRpcResponse(envelopes, requestId);
    if (!matched) {
      throw normalizeError({
        category: "transport",
        message: "MCP server SSE stream contained no JSON-RPC response for this request.",
      });
    }
    return matched as JsonRpcResponse;
  }

  return response.json() as Promise<JsonRpcResponse>;
};

export const createHttpTransport = (options: HttpTransportOptions): McpTransport => {
  const { url, headers, timeoutMs = 20_000 } = options;
  let counter = 0;

  /**
   * Session id captured from the `Mcp-Session-Id` response header.
   * Echoed back in all subsequent requests per spec.
   */
  let sessionId: string | null = null;

  const buildHeaders = (): Record<string, string> => ({
    "Content-Type": "application/json",
    // Both MIME types required per spec; servers return 406 if SSE is absent.
    Accept: "application/json, text/event-stream",
    ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    ...(headers ?? {}),
  });

  const request = async <T>(
    method: string,
    params?: unknown,
    notification = false,
  ): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

    counter += 1;
    const requestId = `rpc-${counter}`;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
    };
    if (!notification) {
      payload.id = requestId;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Capture / refresh session id from any response.
      const sid = response.headers.get("mcp-session-id");
      if (sid) sessionId = sid;

      if (!response.ok) {
        throw normalizeError({
          category:
            response.status === 401 || response.status === 403
              ? "auth"
              : "transport",
          message: `HTTP ${response.status} from MCP server.`,
          status: response.status,
        });
      }

      // Notifications: server replies with 202 No Content (no body to parse).
      if (notification) {
        return undefined as T;
      }

      const json = await parseResponseBody(response, requestId);
      if (json.error) {
        throw normalizeError({
          category: "tool",
          message: json.error.message ?? "MCP error",
          details: json.error.data,
        });
      }
      return json.result as T;
    } catch (error) {
      throw normalizeError(error);
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  };

  return {
    initialize: () =>
      request<McpInitializeResult>("initialize", {
        protocolVersion: "2024-11-05",
        clientInfo: { name: "my-workflow-ext", version: "0.1.0" },
        capabilities: {},
      }),
    notifyInitialized: () =>
      request<void>("notifications/initialized", undefined, true),
    listTools: () => request<McpListToolsResult>("tools/list"),
    callTool: (toolName, input) =>
      request<McpCallToolResult>("tools/call", {
        name: toolName,
        arguments: input,
      }),
  };
};
