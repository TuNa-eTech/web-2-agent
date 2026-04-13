/**
 * Shared SSE (Server-Sent Events) parser for MCP HTTP transports.
 *
 * Both the legacy SSE transport (spec 2024-11-05) and the Streamable HTTP
 * transport (spec 2025-03-26) use the SSE wire format for server→client
 * messages. This module provides utilities to parse SSE streams and extract
 * JSON-RPC envelopes.
 *
 * SSE wire format (RFC 8895):
 *   [optional] : comment line
 *   event: <event-name>\n
 *   data: <payload>\n
 *   \n        ← blank line terminates the event block
 */

export type SseEvent = {
  event: string | null;
  data: string;
  id: string | null;
};

type JsonRpcLike = {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
  method?: string; // server-initiated notifications have method but no id
  params?: unknown;
};

/**
 * Parse a raw SSE body string into discrete events.
 * Handles both \n and \r\n line endings.
 */
export const parseSseText = (text: string): SseEvent[] => {
  const events: SseEvent[] = [];
  // Events are separated by blank lines
  const blocks = text.split(/\r?\n\r?\n/);

  for (const block of blocks) {
    if (!block.trim()) continue;

    let event: string | null = null;
    let data: string | null = null;
    let id: string | null = null;

    for (const rawLine of block.split(/\r?\n/)) {
      if (rawLine.startsWith(":")) continue; // comment
      const colonIdx = rawLine.indexOf(":");
      if (colonIdx === -1) continue;
      const field = rawLine.slice(0, colonIdx).trim();
      const value = rawLine.slice(colonIdx + 1).trimStart(); // single leading space per spec

      if (field === "event") event = value;
      else if (field === "data") data = (data ?? "") + value;
      else if (field === "id") id = value;
    }

    if (data !== null) {
      events.push({ event, data, id });
    }
  }

  return events;
};

/**
 * Extract all JSON-RPC objects from an SSE body, in order.
 * Skips non-JSON lines and pure server notifications (no id).
 * Returns only response envelopes (have `id` that matches a request or
 * are error objects). Notifications are included as-is for callers that
 * want to process them.
 */
export const extractJsonRpcFromSse = (text: string): JsonRpcLike[] => {
  const results: JsonRpcLike[] = [];

  for (const { data } of parseSseText(text)) {
    if (!data || data === "[DONE]") continue;
    try {
      const parsed = JSON.parse(data) as JsonRpcLike;
      if (parsed && typeof parsed === "object" && parsed.jsonrpc === "2.0") {
        results.push(parsed);
      }
    } catch {
      // not JSON — skip
    }
  }

  return results;
};

/**
 * Find the first JSON-RPC response matching a given request id.
 * Falls back to the first response-shaped object (has `result` or `error`)
 * when id matching is not possible (e.g. notification endpoints).
 */
export const findJsonRpcResponse = (
  envelopes: JsonRpcLike[],
  requestId: string,
): JsonRpcLike | null => {
  // Prefer exact id match
  const exact = envelopes.find((e) => String(e.id) === requestId);
  if (exact) return exact;

  // Fallback: first envelope that looks like a response (has result/error)
  const fallback = envelopes.find((e) => "result" in e || "error" in e);
  return fallback ?? null;
};
