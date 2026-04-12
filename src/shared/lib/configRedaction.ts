import { isPlainObject, isStringRecord, safeObjectEntries } from "./objectUtils";

const MASK = "******";

export const maskSensitiveValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return MASK;
  return `${trimmed.slice(0, 2)}${MASK}${trimmed.slice(-2)}`;
};

const redactRecordValues = (value: Record<string, string>): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = maskSensitiveValue(entry);
  }
  return result;
};

const redactServerEntry = (entry: Record<string, unknown>): Record<string, unknown> => {
  const next: Record<string, unknown> = { ...entry };

  if (isStringRecord(entry.headers)) {
    next.headers = redactRecordValues(entry.headers);
  }

  if (isStringRecord(entry.env)) {
    next.env = redactRecordValues(entry.env);
  }

  return next;
};

export const redactConfigDocument = (parsed: Record<string, unknown>): Record<string, unknown> => {
  if (!isPlainObject(parsed)) return parsed;

  const next: Record<string, unknown> = { ...parsed };
  if (!isPlainObject(parsed.mcpServers)) return next;

  const redactedServers: Record<string, unknown> = {};
  for (const [serverId, entry] of safeObjectEntries(parsed.mcpServers)) {
    if (isPlainObject(entry)) {
      redactedServers[serverId] = redactServerEntry(entry);
    } else {
      redactedServers[serverId] = entry;
    }
  }

  next.mcpServers = redactedServers;
  return next;
};
