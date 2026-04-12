import { DEFAULT_CONFIG_DOCUMENT } from "../../shared/lib/configDefaults";
import { getServerEntries, parseRawConfigDocument } from "../../shared/lib/configDocument";
import { getMcpServersRecord, validateRawConfigJson } from "../../shared/lib/configValidation";
import { isPlainObject, isStringRecord, safeObjectEntries } from "../../shared/lib/objectUtils";
import type {
  ConnectionHealth,
  RawMcpConfigDocument,
  ServerIndex,
  ToolCatalog,
} from "../../shared/types";
import { decryptString, encryptString } from "./crypto";
import { getStorageItem, setStorageItems } from "./storageAdapter";
import { STORAGE_KEYS } from "./storageKeys";

type SaveResult =
  | { ok: true; index: ServerIndex[]; warnings: string[] }
  | { ok: false; errors: { code: string; message: string; serverId?: string }[] };

const getTransport = (entry: Record<string, unknown>) => {
  if (typeof entry.url === "string") return "streamable-http";
  return "stdio";
};

const getRuntime = (entry: Record<string, unknown>) => {
  if (typeof entry.url === "string") return "extension-http";
  return "desktop-companion";
};

const hasSecrets = (entry: Record<string, unknown>) => {
  if (isStringRecord(entry.headers)) return Object.keys(entry.headers).length > 0;
  if (isStringRecord(entry.env)) return Object.keys(entry.env).length > 0;
  return false;
};

const buildServerIndex = (
  parsed: Record<string, unknown>,
  healthMap: Record<string, ConnectionHealth> | null,
): ServerIndex[] => {
  const mcpServers = getMcpServersRecord(parsed);
  if (!mcpServers) return [];

  const index: ServerIndex[] = [];
  for (const [serverId, entry] of safeObjectEntries(mcpServers)) {
    if (!isPlainObject(entry)) continue;

    const health = isPlainObject(healthMap?.[serverId]) ? healthMap?.[serverId] : null;
    const status = typeof health?.state === "string" ? health.state : "draft";
    const lastCheckedAt = typeof health?.lastCheckedAt === "string" ? health.lastCheckedAt : null;

    index.push({
      id: serverId,
      name: typeof entry.name === "string" ? entry.name : serverId,
      preset: typeof entry.preset === "string" ? entry.preset : null,
      transport: getTransport(entry),
      runtime: getRuntime(entry),
      status,
      hasSecrets: hasSecrets(entry),
      lastCheckedAt,
    });
  }

  return index;
};

const pruneHealthMap = (
  healthMap: Record<string, ConnectionHealth> | null,
  allowedServerIds: string[]
) => {
  if (!healthMap || !isPlainObject(healthMap)) return {};
  const pruned: Record<string, ConnectionHealth> = {};
  for (const serverId of allowedServerIds) {
    if (serverId in healthMap) {
      pruned[serverId] = healthMap[serverId];
    }
  }
  return pruned;
};

const pruneToolCatalog = (
  toolCatalog: ToolCatalog | null,
  allowedServerIds: string[],
): ToolCatalog => {
  if (!toolCatalog || !isPlainObject(toolCatalog)) {
    return {};
  }

  const pruned: ToolCatalog = {};
  for (const serverId of allowedServerIds) {
    const tools = toolCatalog[serverId];
    if (Array.isArray(tools)) {
      pruned[serverId] = tools;
    }
  }
  return pruned;
};

export const saveRawConfigDocument = async (rawJson: string): Promise<SaveResult> => {
  const validation = validateRawConfigJson(rawJson);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const encryptedPayload = await encryptString(rawJson);
  const healthMap =
    (await getStorageItem<Record<string, ConnectionHealth>>(STORAGE_KEYS.connectionHealth)) ?? null;
  const toolCatalog = (await getStorageItem<ToolCatalog>(STORAGE_KEYS.toolCatalog)) ?? null;
  const index = buildServerIndex(validation.parsed, healthMap);
  const allowedServerIds = index.map((entry) =>
    isPlainObject(entry) && typeof entry.id === "string" ? entry.id : ""
  );
  const prunedHealth = pruneHealthMap(healthMap, allowedServerIds.filter(Boolean));
  const prunedToolCatalog = pruneToolCatalog(toolCatalog, allowedServerIds.filter(Boolean));

  await setStorageItems({
    [STORAGE_KEYS.encryptedConfig]: encryptedPayload,
    [STORAGE_KEYS.serverIndex]: index,
    [STORAGE_KEYS.connectionHealth]: prunedHealth,
    [STORAGE_KEYS.toolCatalog]: prunedToolCatalog,
  });

  return { ok: true, index, warnings: [] };
};

export const loadRawConfigDocument = async (): Promise<string> => {
  const stored = await getStorageItem<{
    version: number;
    cipherText: string;
    iv: string;
    salt: string;
  }>(STORAGE_KEYS.encryptedConfig);

  if (!stored) {
    return DEFAULT_CONFIG_DOCUMENT;
  }

  try {
    return await decryptString(stored);
  } catch {
    return DEFAULT_CONFIG_DOCUMENT;
  }
};

export const loadServerIndex = async (): Promise<unknown[]> => {
  const stored = await getStorageItem<unknown>(STORAGE_KEYS.serverIndex);
  if (!Array.isArray(stored)) return [];
  return stored;
};

export const loadConnectionHealthMap = async (): Promise<Record<string, ConnectionHealth>> => {
  const stored = await getStorageItem<Record<string, ConnectionHealth>>(
    STORAGE_KEYS.connectionHealth,
  );
  if (!stored || !isPlainObject(stored)) return {};
  return stored;
};

export const loadToolCatalog = async (): Promise<ToolCatalog> => {
  const stored = await getStorageItem<ToolCatalog>(STORAGE_KEYS.toolCatalog);
  if (!stored || !isPlainObject(stored)) {
    return {};
  }
  return stored;
};

export const loadParsedConfigDocument = async (): Promise<RawMcpConfigDocument> => {
  const rawJson = await loadRawConfigDocument();
  const parsed = parseRawConfigDocument(rawJson);
  if (!parsed.ok) {
    throw new Error("Stored MCP config is invalid.");
  }
  return parsed.document;
};

export const persistRuntimeState = async (input: {
  document: RawMcpConfigDocument;
  healthMap: Record<string, ConnectionHealth>;
  toolCatalog: ToolCatalog;
}): Promise<ServerIndex[]> => {
  const { document, healthMap, toolCatalog } = input;
  const allowedServerIds = getServerEntries(document).map(([serverId]) => serverId);
  const prunedHealth = pruneHealthMap(healthMap, allowedServerIds);
  const prunedToolCatalog = pruneToolCatalog(toolCatalog, allowedServerIds);
  const index = buildServerIndex(document as unknown as Record<string, unknown>, prunedHealth);

  await setStorageItems({
    [STORAGE_KEYS.serverIndex]: index,
    [STORAGE_KEYS.connectionHealth]: prunedHealth,
    [STORAGE_KEYS.toolCatalog]: prunedToolCatalog,
  });

  return index;
};
