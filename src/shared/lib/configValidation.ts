import { isPlainObject, isStringArray, isStringRecord, safeObjectEntries } from "./objectUtils";

export type ValidationIssueCode =
  | "invalid_json"
  | "invalid_top_level"
  | "invalid_http"
  | "invalid_stdio";

export type ValidationIssue = {
  code: ValidationIssueCode;
  message: string;
  serverId?: string;
  path?: string;
};

export type ValidationResult =
  | { ok: true; parsed: Record<string, unknown> }
  | { ok: false; errors: ValidationIssue[] };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validateHttpEntry = (serverId: string, entry: Record<string, unknown>) => {
  const errors: ValidationIssue[] = [];
  if (!isNonEmptyString(entry.url)) {
    errors.push({
      code: "invalid_http",
      serverId,
      path: `mcpServers.${serverId}.url`,
      message: "HTTP server entry requires a non-empty url string.",
    });
  }
  if (typeof entry.transport !== "undefined" && entry.transport !== "streamable-http") {
    errors.push({
      code: "invalid_http",
      serverId,
      path: `mcpServers.${serverId}.transport`,
      message: "HTTP server transport must be 'streamable-http' when provided.",
    });
  }
  if (typeof entry.headers !== "undefined" && !isStringRecord(entry.headers)) {
    errors.push({
      code: "invalid_http",
      serverId,
      path: `mcpServers.${serverId}.headers`,
      message: "HTTP server headers must be a record of string values.",
    });
  }
  return errors;
};

const validateStdioEntry = (serverId: string, entry: Record<string, unknown>) => {
  const errors: ValidationIssue[] = [];
  if (!isNonEmptyString(entry.command)) {
    errors.push({
      code: "invalid_stdio",
      serverId,
      path: `mcpServers.${serverId}.command`,
      message: "Local server entry requires a non-empty command string.",
    });
  }
  if (typeof entry.args !== "undefined" && !isStringArray(entry.args)) {
    errors.push({
      code: "invalid_stdio",
      serverId,
      path: `mcpServers.${serverId}.args`,
      message: "Local server args must be an array of strings.",
    });
  }
  if (typeof entry.env !== "undefined" && !isStringRecord(entry.env)) {
    errors.push({
      code: "invalid_stdio",
      serverId,
      path: `mcpServers.${serverId}.env`,
      message: "Local server env must be a record of string values.",
    });
  }
  if (
    typeof entry.stdioProtocol !== "undefined" &&
    entry.stdioProtocol !== "content-length" &&
    entry.stdioProtocol !== "json-lines" &&
    entry.stdioProtocol !== "auto"
  ) {
    errors.push({
      code: "invalid_stdio",
      serverId,
      path: `mcpServers.${serverId}.stdioProtocol`,
      message: "Local server stdioProtocol must be 'content-length', 'json-lines', or 'auto'.",
    });
  }
  return errors;
};

export const getMcpServersRecord = (
  parsed: Record<string, unknown>
): Record<string, unknown> | null => {
  const mcpServers = parsed.mcpServers;
  if (!isPlainObject(mcpServers)) return null;
  return mcpServers;
};

export const validateRawConfigJson = (rawJson: string): ValidationResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_json",
          message: "Config is not valid JSON.",
        },
      ],
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_top_level",
          message: "Top-level config must be an object.",
        },
      ],
    };
  }

  const mcpServers = getMcpServersRecord(parsed);
  if (!mcpServers) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_top_level",
          message: "Top-level config must include an mcpServers object.",
        },
      ],
    };
  }

  const errors: ValidationIssue[] = [];
  for (const [serverId, entry] of safeObjectEntries(mcpServers)) {
    if (!isPlainObject(entry)) {
      errors.push({
        code: "invalid_top_level",
        serverId,
        path: `mcpServers.${serverId}`,
        message: "Server entry must be an object.",
      });
      continue;
    }

    const hasUrl = typeof entry.url !== "undefined";
    const hasCommand = typeof entry.command !== "undefined";

    if (hasUrl && hasCommand) {
      errors.push({
        code: "invalid_top_level",
        serverId,
        path: `mcpServers.${serverId}`,
        message: "Server entry must use either url or command, not both.",
      });
      continue;
    }

    if (hasUrl) {
      errors.push(...validateHttpEntry(serverId, entry));
      continue;
    }

    if (hasCommand) {
      errors.push(...validateStdioEntry(serverId, entry));
      continue;
    }

    errors.push({
      code: "invalid_top_level",
      serverId,
      path: `mcpServers.${serverId}`,
      message: "Server entry must include either url or command.",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, parsed };
};
