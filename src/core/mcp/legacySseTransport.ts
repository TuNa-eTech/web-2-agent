/**
 * MCP Legacy SSE Transport (spec 2024-11-05)
 *
 * This transport uses two separate channels:
 *
 *   1. GET {url}          → persistent SSE stream (server→client)
 *                           First event is `event: endpoint` carrying the
 *                           POST URL for sending requests.
 *
 *   2. POST {endpointUrl} → JSON-RPC requests (client→server)
 *                           Responses arrive on the SSE stream, matched by id.
 *
 * Identified in config by `transport: "sse"`.
 *
 * Note: The SSE stream is opened eagerly on `connect()` / `initialize()` and
 * torn down when all pending requests resolve or on explicit `disconnect()`.
 * Because Chrome extension service workers may be terminated, we open a fresh
 * SSE connection per `initialize()` call rather than keeping one alive across
 * sessions.
 */
import type {
  McpCallToolResult,
  McpInitializeResult,
  McpListToolsResult,
} from "./types";
import { normalizeError } from "../utils/normalizeError";
import { parseSseText } from "./sseParser";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string;
  method: string;
  params?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

export type LegacySseTransportOptions = {
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

/**
 * Open a GET SSE connection and wait for the `endpoint` event which gives us
 * the POST URL for sending JSON-RPC requests.
 */
const openSseAndGetEndpoint = async (
  sseUrl: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<{ endpointUrl: string; reader: ReadableStreamDefaultReader<Uint8Array> }> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(sseUrl, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        ...headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw normalizeError({
        category:
          response.status === 401 || response.status === 403 ? "auth" : "transport",
        message: `SSE connection failed with HTTP ${response.status}.`,
        status: response.status,
      });
    }

    if (!response.body) {
      throw normalizeError({
        category: "transport",
        message: "SSE response has no readable body.",
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Read SSE chunks until we find the `endpoint` event
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      for (const event of parseSseText(buffer)) {
        if (event.event === "endpoint" && event.data) {
          globalThis.clearTimeout(timeoutId);
          // endpoint may be relative — resolve it against the SSE URL
          const endpointUrl = new URL(event.data, sseUrl).toString();
          return { endpointUrl, reader };
        }
      }
    }

    throw normalizeError({
      category: "transport",
      message: "SSE stream closed before receiving the endpoint event.",
    });
  } catch (error) {
    globalThis.clearTimeout(timeoutId);
    throw normalizeError(error);
  }
};

/**
 * Wait for a JSON-RPC response with matching id on the SSE reader.
 * Reads chunks until a matching response is found or the stream ends.
 */
const waitForResponse = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  requestId: string,
  timeoutMs: number,
): Promise<JsonRpcResponse> => {
  const decoder = new TextDecoder();
  let buffer = "";
  const seenIds = new Set<string>();

  const timer = new Promise<never>((_, reject) =>
    globalThis.setTimeout(
      () => reject(normalizeError({ category: "transport", message: "MCP request timed out." })),
      timeoutMs,
    ),
  );

  const reader$ = (async (): Promise<JsonRpcResponse> => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      for (const event of parseSseText(buffer)) {
        if (!event.data || event.data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(event.data) as JsonRpcResponse;
          if (!parsed || parsed.jsonrpc !== "2.0") continue;
          const eid = parsed.id !== undefined && parsed.id !== null ? String(parsed.id) : null;
          if (eid === requestId) return parsed;
          if (eid) seenIds.add(eid); // response for another in-flight request — keep reading
        } catch {
          // not JSON — skip
        }
      }
    }
    throw normalizeError({
      category: "transport",
      message: "SSE stream closed before receiving response.",
    });
  })();

  return Promise.race([reader$, timer]);
};

export const createLegacySseTransport = (
  options: LegacySseTransportOptions,
): McpTransport => {
  const { url, headers = {}, timeoutMs = 20_000 } = options;
  let counter = 0;

  // Shared SSE reader; established during initialize, reused for subsequent calls.
  let sseReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let endpointUrl: string | null = null;

  const ensureConnected = async (): Promise<void> => {
    if (sseReader && endpointUrl) return;
    const result = await openSseAndGetEndpoint(url, headers, timeoutMs);
    sseReader = result.reader;
    endpointUrl = result.endpointUrl;
  };

  const post = async <T>(
    method: string,
    params?: unknown,
    notification = false,
  ): Promise<T> => {
    await ensureConnected();

    counter += 1;
    const requestId = `rpc-${counter}`;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", method, params };
    if (!notification) {
      payload.id = requestId;
    }

    const postHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    const resp = await fetch(endpointUrl!, {
      method: "POST",
      headers: postHeaders,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw normalizeError({
        category:
          resp.status === 401 || resp.status === 403 ? "auth" : "transport",
        message: `HTTP ${resp.status} posting to SSE endpoint.`,
        status: resp.status,
      });
    }

    if (notification) return undefined as T;

    // Response arrives on the SSE stream
    const json = await waitForResponse(sseReader!, requestId, timeoutMs);
    if (json.error) {
      throw normalizeError({
        category: "tool",
        message: json.error.message ?? "MCP error",
        details: json.error.data,
      });
    }
    return json.result as T;
  };

  return {
    initialize: async () => {
      await ensureConnected();
      return post<McpInitializeResult>("initialize", {
        protocolVersion: "2024-11-05",
        clientInfo: { name: "my-workflow-ext", version: "0.1.0" },
        capabilities: {},
      });
    },
    notifyInitialized: () => post<void>("notifications/initialized", undefined, true),
    listTools: () => post<McpListToolsResult>("tools/list"),
    callTool: (toolName, input) =>
      post<McpCallToolResult>("tools/call", { name: toolName, arguments: input }),
  };
};
