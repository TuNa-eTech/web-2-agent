// ---------------------------------------------------------------------------
// Data loading — reads MCP tools + Skills from chrome.storage
// ---------------------------------------------------------------------------

import type { BrokerTool, ToolCatalog } from "../shared/types";
import type { SkillMeta, SkillIndex } from "../core/skills/types";
import { STORAGE_KEYS } from "../core/storage/storageKeys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToolbarTool = Pick<
  BrokerTool,
  "serverId" | "originalName" | "namespacedName" | "description" | "risk" | "enabled"
>;

export type ToolbarSkill = Pick<
  SkillMeta,
  "id" | "name" | "description" | "enabled" | "injection" | "tags"
>;

export type ToolbarData = {
  tools: ToolbarTool[];
  skills: ToolbarSkill[];
};

// ---------------------------------------------------------------------------
// Storage helpers (content script uses chrome.storage directly)
// ---------------------------------------------------------------------------

const getItem = <T>(key: string): Promise<T | null> =>
  new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve((result[key] as T) ?? null);
    });
  });

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export const loadToolbarData = async (): Promise<ToolbarData> => {
  const [rawCatalog, rawSkillIndex] = await Promise.all([
    getItem<ToolCatalog>(STORAGE_KEYS.toolCatalog),
    getItem<SkillIndex>(STORAGE_KEYS.skillIndex),
  ]);

  // Flatten tool catalog: { serverId: BrokerTool[] } → flat ToolbarTool[]
  const tools: ToolbarTool[] = rawCatalog
    ? Object.values(rawCatalog)
        .flat()
        .filter((t) => t.enabled)
        .map(({ serverId, originalName, namespacedName, description, risk, enabled }) => ({
          serverId,
          originalName,
          namespacedName,
          description,
          risk,
          enabled,
        }))
    : [];

  const skills: ToolbarSkill[] = rawSkillIndex?.skills ?? [];

  return { tools, skills };
};

// ---------------------------------------------------------------------------
// Live data subscriber — re-emits whenever relevant storage keys change
// ---------------------------------------------------------------------------

export type ToolbarDataListener = (data: ToolbarData) => void;

/**
 * Subscribe to storage changes. Returns an unsubscribe function.
 * When tool catalog or skill index changes, re-loads all data and calls `cb`.
 */
export const subscribeToolbarData = (cb: ToolbarDataListener): (() => void) => {
  const handler = (changes: Record<string, chrome.storage.StorageChange>) => {
    const relevant = Object.keys(changes).some(
      (key) =>
        key === STORAGE_KEYS.toolCatalog ||
        key === STORAGE_KEYS.skillIndex ||
        key.startsWith("skills."),
    );
    if (relevant) {
      void loadToolbarData().then(cb);
    }
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
};

// ---------------------------------------------------------------------------
// Toggle skill (content script → background)
// ---------------------------------------------------------------------------

export const toggleSkillFromContent = (skillId: string, enabled: boolean): void => {
  chrome.runtime.sendMessage({
    type: "content:toggle-skill",
    skillId,
    enabled,
  });
};

// ---------------------------------------------------------------------------
// Execute tool (content script → background → MCP server → result)
// ---------------------------------------------------------------------------

export type ToolExecutionResult = {
  ok: boolean;
  output?: unknown;
  isError?: boolean;
  error?: string;
};

/**
 * Execute an MCP tool from the content script.
 * Sends a message to the background service worker which runs the tool
 * via the configured transport and returns the result.
 */
export const executeToolFromContent = (
  namespacedName: string,
  args: Record<string, unknown> = {},
): Promise<ToolExecutionResult> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "content:execute-tool", namespacedName, args },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        if (!response?.ok) {
          resolve({ ok: false, error: response?.error ?? "Unknown error" });
          return;
        }
        resolve({
          ok: true,
          output: response.result?.output,
          isError: response.result?.isError ?? false,
        });
      },
    );
  });

// ---------------------------------------------------------------------------
// Context prompt builder — loads public/context-template.md and fills placeholders
// ---------------------------------------------------------------------------

/** Render the {{MCP_TOOLS}} placeholder content. */
const renderToolsSection = (tools: ToolbarTool[]): string => {
  if (tools.length === 0) return "_No MCP tools connected._";

  const byServer: Record<string, ToolbarTool[]> = {};
  for (const t of tools) {
    (byServer[t.serverId] ??= []).push(t);
  }

  const lines: string[] = ["## Available MCP Tools\n"];
  for (const [serverId, serverTools] of Object.entries(byServer)) {
    lines.push(`### Server: ${serverId}`);
    for (const t of serverTools) {
      const risk = t.risk === "write" ? " ⚠️ write" : "";
      lines.push(`- **${t.originalName}**${risk}: ${t.description || "No description"}`);
    }
    lines.push("");
  }
  return lines.join("\n");
};

/** Render the {{SKILLS}} placeholder content. */
const renderSkillsSection = (skills: ToolbarSkill[]): string => {
  const active = skills.filter((s) => s.enabled);
  if (active.length === 0) return "_No skills active._";

  const lines: string[] = ["## Active Skills\n"];
  for (const s of active) {
    lines.push(`- **${s.name}**: ${s.description || "No description"}`);
  }
  return lines.join("\n");
};

/** Cache the template so we fetch it only once per session. */
let templateCache: string | null = null;

const loadTemplate = async (): Promise<string> => {
  if (templateCache) return templateCache;

  try {
    const url = chrome.runtime.getURL("public/context-template.md");
    const res = await fetch(url);
    if (res.ok) {
      templateCache = await res.text();
      return templateCache;
    }
  } catch {
    // Fallback if fetch fails
  }

  // Hardcoded fallback in case file is missing
  templateCache =
    "# MCP Context\n\n{{MCP_TOOLS}}\n\n{{SKILLS}}\n\nPlease use available tools when relevant.";
  return templateCache;
};

/**
 * Build context prompt by loading the MD template and replacing placeholders.
 * Returns a Promise because the template is fetched asynchronously on first call.
 */
export const buildContextPrompt = async (data: ToolbarData): Promise<string> => {
  if (data.tools.length === 0 && data.skills.every((s) => !s.enabled)) {
    return "No MCP tools or skills are currently configured. Open the extension options to set them up.";
  }

  const template = await loadTemplate();

  return template
    .replace("{{MCP_TOOLS}}", renderToolsSection(data.tools))
    .replace("{{SKILLS}}", renderSkillsSection(data.skills));
};
