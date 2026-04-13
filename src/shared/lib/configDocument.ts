import type {
  RawMcpConfigDocument,
  RawMcpHttpServerConfig,
  RawMcpServerConfig,
  RawMcpSseServerConfig,
  RawMcpStdioServerConfig,
} from "../types";
import type { ValidationIssue } from "./configValidation";
import { safeObjectEntries } from "./objectUtils";
import { validateRawConfigJson } from "./configValidation";

export type ParsedRawConfigResult =
  | { ok: true; document: RawMcpConfigDocument }
  | { ok: false; errors: ValidationIssue[] };

export const parseRawConfigDocument = (
  rawJson: string,
): ParsedRawConfigResult => {
  const validation = validateRawConfigJson(rawJson);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    document: validation.parsed as RawMcpConfigDocument,
  };
};

/**
 * Streamable HTTP transport (MCP spec 2025-03-26).
 * Identified by having a `url` field WITHOUT `transport: "sse"`.
 */
export const isHttpServerConfig = (
  config: RawMcpServerConfig,
): config is RawMcpHttpServerConfig =>
  "url" in config &&
  typeof config.url === "string" &&
  (config as { transport?: string }).transport !== "sse";

/**
 * Legacy SSE transport (MCP spec 2024-11-05).
 * Identified by `transport: "sse"` explicitly set.
 */
export const isSseServerConfig = (
  config: RawMcpServerConfig,
): config is RawMcpSseServerConfig =>
  "url" in config &&
  typeof config.url === "string" &&
  (config as { transport?: string }).transport === "sse";

export const isStdioServerConfig = (
  config: RawMcpServerConfig,
): config is RawMcpStdioServerConfig =>
  "command" in config && typeof config.command === "string";

export const getServerEntries = (
  document: RawMcpConfigDocument,
): Array<[string, RawMcpServerConfig]> =>
  safeObjectEntries(document.mcpServers) as Array<[string, RawMcpServerConfig]>;
