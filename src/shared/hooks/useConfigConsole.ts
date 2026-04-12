import { useEffect, useState } from "react";
import {
  loadConnectionHealthMap,
  loadToolCatalog,
  loadRawConfigDocument,
  loadServerIndex,
  saveRawConfigDocument,
} from "../../core/storage/configStorage";
import { loadMcpPreferences, type McpPreferencesMap } from "../../core/storage/mcpPreferences";
import { redactConfigDocument } from "../lib/configRedaction";
import { validateRawConfigJson } from "../lib/configValidation";
import type { ToolCatalog } from "../types";

type RuntimeNotice = {
  tone: "neutral" | "success" | "error";
  message: string;
} | null;

type ConnectionTestSummary = {
  tested: number;
  connected: number;
  failed: number;
};

type ConsoleState = {
  loading: boolean;
  saving: boolean;
  testing: boolean;
  rawJson: string;
  serverIndex: unknown[];
  healthMap: Record<string, unknown>;
  toolCatalog: ToolCatalog;
  mcpPreferences: McpPreferencesMap;
  errors: { code: string; message: string; serverId?: string; path?: string }[];
  redactedPreview: string | null;
  runtimeNotice: RuntimeNotice;
};

const buildRedactedPreview = (rawJson: string): string | null => {
  const validation = validateRawConfigJson(rawJson);
  if (!validation.ok) return null;
  const redacted = redactConfigDocument(validation.parsed);
  return JSON.stringify(redacted, null, 2);
};

export const useConfigConsole = () => {
  const [state, setState] = useState<ConsoleState>({
    loading: true,
    saving: false,
    testing: false,
    rawJson: "",
    serverIndex: [],
    healthMap: {},
    toolCatalog: {},
    mcpPreferences: {},
    errors: [],
    redactedPreview: null,
    runtimeNotice: null,
  });

  const sendRuntimeMessage = async <T>(message: unknown): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: T | { ok?: false; error?: string }) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (
          response &&
          typeof response === "object" &&
          "ok" in response &&
          response.ok === false
        ) {
          reject(new Error(response.error ?? "Runtime request failed."));
          return;
        }
        resolve(response as T);
      });
    });

  const persistCurrentDocument = async (rawJson: string) => {
    const result = await saveRawConfigDocument(rawJson);
    if (!result.ok) {
      setState((prev) => ({
        ...prev,
        saving: false,
        testing: false,
        errors: result.errors,
        runtimeNotice: {
          tone: "error",
          message: "Fix validation errors before saving or testing connections.",
        },
      }));
      return false;
    }
    return true;
  };

  const reload = async () => {
    setState((prev) => ({ ...prev, loading: true, errors: [] }));
    const [rawJson, serverIndex, healthMap, toolCatalog, mcpPreferences] = await Promise.all([
      loadRawConfigDocument(),
      loadServerIndex(),
      loadConnectionHealthMap(),
      loadToolCatalog(),
      loadMcpPreferences(),
    ]);
    setState((prev) => ({
      ...prev,
      loading: false,
      rawJson,
      serverIndex,
      healthMap,
      toolCatalog,
      mcpPreferences,
      redactedPreview: buildRedactedPreview(rawJson),
    }));
  };

  const updateRawJson = (value: string) => {
    setState((prev) => ({
      ...prev,
      rawJson: value,
      redactedPreview: buildRedactedPreview(value),
    }));
  };

  const save = async () => {
    setState((prev) => ({
      ...prev,
      saving: true,
      errors: [],
      runtimeNotice: null,
    }));
    const persisted = await persistCurrentDocument(state.rawJson);
    if (!persisted) {
      return;
    }
    const [serverIndex, healthMap, toolCatalog] = await Promise.all([
      loadServerIndex(),
      loadConnectionHealthMap(),
      loadToolCatalog(),
    ]);
    setState((prev) => ({
      ...prev,
      saving: false,
      serverIndex,
      healthMap,
      toolCatalog,
      errors: [],
      runtimeNotice: {
        tone: "success",
        message: "Config saved.",
      },
    }));
  };

  const testConnections = async () => {
    setState((prev) => ({
      ...prev,
      testing: true,
      errors: [],
      runtimeNotice: null,
    }));

    const persisted = await persistCurrentDocument(state.rawJson);
    if (!persisted) {
      return;
    }

    try {
      const response = await sendRuntimeMessage<{
        ok: true;
        summary: ConnectionTestSummary;
      }>({
        type: "options:test-connections",
      });

      const [serverIndex, healthMap, toolCatalog] = await Promise.all([
        loadServerIndex(),
        loadConnectionHealthMap(),
        loadToolCatalog(),
      ]);

      setState((prev) => ({
        ...prev,
        testing: false,
        serverIndex,
        healthMap,
        toolCatalog,
        errors: [],
        runtimeNotice: {
          tone: response.summary.failed === 0 ? "success" : "neutral",
          message:
            response.summary.failed === 0
              ? `Connected ${response.summary.connected}/${response.summary.tested} servers.`
              : `Connected ${response.summary.connected}/${response.summary.tested} servers; ${response.summary.failed} failed.`,
        },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        testing: false,
        runtimeNotice: {
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to test configured MCP servers.",
        },
      }));
    }
  };

  // -----------------------------------------------------------------------
  // Toggle actions — optimistic update then sync with background
  // -----------------------------------------------------------------------

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    try {
      const response = await sendRuntimeMessage<{
        ok: true;
        prefs: McpPreferencesMap;
        catalog: ToolCatalog;
      }>({
        type: "options:toggle-server",
        serverId,
        enabled,
      });

      setState((prev) => ({
        ...prev,
        mcpPreferences: response.prefs,
        toolCatalog: response.catalog,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        runtimeNotice: {
          tone: "error",
          message: error instanceof Error ? error.message : "Toggle failed.",
        },
      }));
    }
  };

  const handleToggleTool = async (
    serverId: string,
    toolName: string,
    enabled: boolean,
  ) => {
    try {
      const response = await sendRuntimeMessage<{
        ok: true;
        prefs: McpPreferencesMap;
        catalog: ToolCatalog;
      }>({
        type: "options:toggle-tool",
        serverId,
        toolName,
        enabled,
      });

      setState((prev) => ({
        ...prev,
        mcpPreferences: response.prefs,
        toolCatalog: response.catalog,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        runtimeNotice: {
          tone: "error",
          message: error instanceof Error ? error.message : "Toggle failed.",
        },
      }));
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return {
    ...state,
    reload,
    save,
    testConnections,
    updateRawJson,
    toggleServer: handleToggleServer,
    toggleTool: handleToggleTool,
  };
};
