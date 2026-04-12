import type {
  McpCallToolResult,
  McpInitializeResult,
  McpListToolsResult,
} from "./types";
import { normalizeError } from "../utils/normalizeError";

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

export const createHttpTransport = (options: HttpTransportOptions): McpTransport => {
  const { url, headers, timeoutMs = 20_000 } = options;
  let counter = 0;

  const request = async <T>(
    method: string,
    params?: unknown,
    notification = false
  ): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
    };
    if (!notification) {
      counter += 1;
      payload.id = `rpc-${counter}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(headers ?? {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

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

      if (notification) {
        return undefined as T;
      }

      const json = (await response.json()) as JsonRpcResponse;
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
        clientInfo: {
          name: "my-workflow-ext",
          version: "0.1.0",
        },
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
