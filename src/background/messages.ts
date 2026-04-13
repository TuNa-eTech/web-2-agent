import type { ConnectionManager } from "./runtime/connection-manager";
import { toggleSkill } from "../core/skills/skillStorage";
import { loadParsedConfigDocument } from "../core/storage/configStorage";
import { createHttpTransport } from "../core/mcp/httpTransport";
import { createLegacySseTransport } from "../core/mcp/legacySseTransport";
import { createCompanionClient } from "./runtime/companion-client";
import { createCompanionTransport } from "../core/mcp/companionTransport";
import { isHttpServerConfig, isSseServerConfig, isStdioServerConfig } from "../shared/lib/configDocument";
import { parseNamespacedToolName } from "../core/utils/namespacing";
import type { RawMcpConfigDocument } from "../shared/types";
import {
  loadMcpPreferences,
  toggleServer,
  toggleTool,
  buildToolPolicyFromPreferences,
} from "../core/storage/mcpPreferences";
import { loadToolCatalog } from "../core/storage/configStorage";
import { applyToolPolicyToCatalog } from "../core/permissions/toolPolicy";
import { setStorageItem } from "../core/storage/storageAdapter";
import { STORAGE_KEYS } from "../core/storage/storageKeys";
import type { ToolCatalog } from "../shared/types";

type OneShotMessage =
  | { type: "popup:ping" }
  | { type: "options:ping" }
  | { type: "popup:open-options" }
  | { type: "popup:open-sidepanel"; serverId?: string; actionId?: string }
  | { type: "options:test-connections" }
  | { type: "options:load-preferences" }
  | { type: "options:toggle-server"; serverId: string; enabled: boolean }
  | { type: "options:toggle-tool"; serverId: string; toolName: string; enabled: boolean }
  | { type: "content:toggle-skill"; skillId: string; enabled: boolean }
  | { type: "content:execute-tool"; namespacedName: string; args?: Record<string, unknown> };

/**
 * After a toggle changes preferences, re-apply the policy to the stored
 * tool catalog so downstream consumers (chat orchestrator) see the change
 * immediately without a full re-connect.
 */
const reapplyPreferencesToCatalog = async (): Promise<ToolCatalog> => {
  const [catalog, prefs] = await Promise.all([
    loadToolCatalog(),
    loadMcpPreferences(),
  ]);

  const updated: ToolCatalog = {};
  for (const [serverId, tools] of Object.entries(catalog)) {
    const policy = buildToolPolicyFromPreferences(serverId, prefs);
    if (!policy.serverEnabled) {
      // Server disabled → clear its tools so nothing reaches AI.
      updated[serverId] = tools.map((t) => ({ ...t, enabled: false }));
    } else {
      updated[serverId] = applyToolPolicyToCatalog(tools, policy);
    }
  }

  await setStorageItem(STORAGE_KEYS.toolCatalog, updated);
  return updated;
};

/**
 * Execute a single MCP tool by its namespaced name.
 * Used by the content script toolbar for direct tool execution.
 */
const executeToolDirect = async (
  namespacedName: string,
  args: Record<string, unknown> = {},
): Promise<{ output: unknown; isError: boolean }> => {
  const parsed = parseNamespacedToolName(namespacedName);
  if (!parsed) {
    return { output: `Cannot parse tool name: ${namespacedName}`, isError: true };
  }

  const { serverId, originalName } = parsed;
  const document = await loadParsedConfigDocument().catch(
    () => ({ mcpServers: {} } as RawMcpConfigDocument),
  );
  const serverConfig = document.mcpServers?.[serverId];
  if (!serverConfig) {
    return { output: `Server "${serverId}" not found in config.`, isError: true };
  }

  type McpResultShape = { content?: unknown; isError?: boolean };
  let result: McpResultShape;

  if (isHttpServerConfig(serverConfig)) {
    const transport = createHttpTransport({ url: serverConfig.url, headers: serverConfig.headers });
    await transport.initialize();
    await transport.notifyInitialized();
    result = (await transport.callTool(originalName, args)) as McpResultShape;
  } else if (isSseServerConfig(serverConfig)) {
    const transport = createLegacySseTransport({ url: serverConfig.url, headers: serverConfig.headers });
    await transport.initialize();
    await transport.notifyInitialized();
    result = (await transport.callTool(originalName, args)) as McpResultShape;
  } else if (isStdioServerConfig(serverConfig)) {
    const companionClient = createCompanionClient();
    const transport = createCompanionTransport({ serverId, config: serverConfig, client: companionClient });
    await transport.spawn();
    await transport.initialize();
    result = (await transport.callTool(originalName, args)) as McpResultShape;
  } else {
    return { output: "Unsupported server transport.", isError: true };
  }

  return {
    output: result.content ?? result,
    isError: result.isError ?? false,
  };
};

export const registerOneShotRouter = (services: {
  connectionManager: ConnectionManager;
}) => {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return false;
    }

    const payload = message as OneShotMessage;

    switch (payload.type) {
      case "popup:ping":
      case "options:ping":
        sendResponse({ ok: true });
        return false;
      case "popup:open-options":
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return false;
      case "popup:open-sidepanel":
        chrome.windows.getCurrent((currentWindow) => {
          const windowId = currentWindow.id;

          if (windowId === undefined) {
            sendResponse({ ok: false, error: "missing_window_id" });
            return;
          }

          chrome.sidePanel.open({ windowId }, () => {
            const error = chrome.runtime.lastError;
            if (error) {
              sendResponse({ ok: false, error: error.message });
              return;
            }
            sendResponse({ ok: true });
          });
        });
        return true;
      case "options:test-connections":
        void services.connectionManager
          .testAllConnections()
          .then((summary) => {
            sendResponse({ ok: true, summary });
          })
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : "Failed to test configured MCP servers.";
            sendResponse({ ok: false, error: message });
          });
        return true;
      case "options:load-preferences":
        void loadMcpPreferences()
          .then((prefs) => {
            sendResponse({ ok: true, prefs });
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : "Failed to load preferences.";
            sendResponse({ ok: false, error: msg });
          });
        return true;
      case "options:toggle-server":
        void toggleServer(payload.serverId, payload.enabled)
          .then(async (prefs) => {
            const catalog = await reapplyPreferencesToCatalog();
            sendResponse({ ok: true, prefs, catalog });
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : "Failed to toggle server.";
            sendResponse({ ok: false, error: msg });
          });
        return true;
      case "options:toggle-tool":
        void toggleTool(payload.serverId, payload.toolName, payload.enabled)
          .then(async (prefs) => {
            const catalog = await reapplyPreferencesToCatalog();
            sendResponse({ ok: true, prefs, catalog });
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : "Failed to toggle tool.";
            sendResponse({ ok: false, error: msg });
          });
        return true;
      case "content:toggle-skill":
        void toggleSkill(payload.skillId, payload.enabled)
          .then(() => {
            sendResponse({ ok: true });
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : "Failed to toggle skill.";
            sendResponse({ ok: false, error: msg });
          });
        return true;
      case "content:execute-tool":
        void executeToolDirect(payload.namespacedName, payload.args)
          .then((result) => {
            sendResponse({ ok: true, result });
          })
          .catch((error) => {
            const msg = error instanceof Error ? error.message : "Tool execution failed.";
            sendResponse({ ok: false, error: msg });
          });
        return true;
      default:
        sendResponse({ ok: false, error: "unhandled_message" });
        return false;
    }
  });
};
