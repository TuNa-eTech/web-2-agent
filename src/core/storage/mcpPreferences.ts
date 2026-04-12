import type { ToolPolicy } from "../../shared/types";
import { isPlainObject } from "../../shared/lib/objectUtils";
import { getStorageItem, setStorageItem } from "./storageAdapter";
import { STORAGE_KEYS } from "./storageKeys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type McpServerPreference = {
  /** false = server disabled entirely; its tools won't reach the AI. */
  enabled: boolean;
  /** Per-tool overrides keyed by the tool's *original* name. */
  toolOverrides: Record<string, boolean>;
};

export type McpPreferencesMap = Record<string, McpServerPreference>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SERVER_PREFERENCE: McpServerPreference = {
  enabled: true,
  toolOverrides: {},
};

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const isValidPreference = (value: unknown): value is McpServerPreference =>
  isPlainObject(value) &&
  typeof value.enabled === "boolean" &&
  isPlainObject(value.toolOverrides);

const prunePreferencesMap = (raw: unknown): McpPreferencesMap => {
  if (!isPlainObject(raw)) return {};
  const result: McpPreferencesMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isValidPreference(value)) {
      result[key] = value;
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// Public API — load / save
// ---------------------------------------------------------------------------

export const loadMcpPreferences = async (): Promise<McpPreferencesMap> => {
  const stored = await getStorageItem<unknown>(STORAGE_KEYS.mcpPreferences);
  return prunePreferencesMap(stored);
};

export const saveMcpPreferences = async (
  prefs: McpPreferencesMap,
): Promise<void> => {
  await setStorageItem(STORAGE_KEYS.mcpPreferences, prefs);
};

// ---------------------------------------------------------------------------
// Public API — atomic toggles
// ---------------------------------------------------------------------------

export const toggleServer = async (
  serverId: string,
  enabled: boolean,
): Promise<McpPreferencesMap> => {
  const prefs = await loadMcpPreferences();
  const current = prefs[serverId] ?? { ...DEFAULT_SERVER_PREFERENCE };
  prefs[serverId] = { ...current, enabled };
  await saveMcpPreferences(prefs);
  return prefs;
};

export const toggleTool = async (
  serverId: string,
  toolName: string,
  enabled: boolean,
): Promise<McpPreferencesMap> => {
  const prefs = await loadMcpPreferences();
  const current = prefs[serverId] ?? { ...DEFAULT_SERVER_PREFERENCE };
  const overrides = { ...current.toolOverrides, [toolName]: enabled };
  prefs[serverId] = { ...current, toolOverrides: overrides };
  await saveMcpPreferences(prefs);
  return prefs;
};

// ---------------------------------------------------------------------------
// Policy builder — converts user preferences into a ToolPolicy
// ---------------------------------------------------------------------------

export const buildToolPolicyFromPreferences = (
  serverId: string,
  prefs: McpPreferencesMap,
): ToolPolicy => {
  const serverPref = prefs[serverId];

  // No preference recorded → everything enabled (default behaviour).
  if (!serverPref) {
    return {
      serverEnabled: true,
      allowedTools: [],
      blockedTools: [],
      confirmWrites: true,
    };
  }

  // Collect explicitly disabled (blocked) tool names.
  const blockedTools = Object.entries(serverPref.toolOverrides)
    .filter(([, enabled]) => !enabled)
    .map(([name]) => name);

  return {
    serverEnabled: serverPref.enabled,
    allowedTools: [], // empty = allow-all (minus blocked)
    blockedTools,
    confirmWrites: true,
  };
};
