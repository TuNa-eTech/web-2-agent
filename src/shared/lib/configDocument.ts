import type {
  RawMcpConfigDocument,
  RawMcpHttpServerConfig,
  RawMcpServerConfig,
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

export const isHttpServerConfig = (
  config: RawMcpServerConfig,
): config is RawMcpHttpServerConfig =>
  "url" in config && typeof config.url === "string";

export const isStdioServerConfig = (
  config: RawMcpServerConfig,
): config is RawMcpStdioServerConfig =>
  "command" in config && typeof config.command === "string";

export const getServerEntries = (
  document: RawMcpConfigDocument,
): Array<[string, RawMcpServerConfig]> =>
  safeObjectEntries(document.mcpServers) as Array<[string, RawMcpServerConfig]>;
