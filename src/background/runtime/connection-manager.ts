import type {
  BrokerTool,
  ConnectionErrorCategory,
  ConnectionHealth,
  RawMcpConfigDocument,
  RawMcpServerConfig,
  ToolCatalog,
} from "../../shared/types";
import { getServerEntries, isHttpServerConfig, isStdioServerConfig } from "../../shared/lib/configDocument";
import { createCompanionTransport } from "../../core/mcp/companionTransport";
import { createHttpTransport } from "../../core/mcp/httpTransport";
import type { McpInitializeResult, McpToolDefinition } from "../../core/mcp/types";
import { ensureHostPermission } from "../../core/permissions/hostPermissions";
import { normalizeError } from "../../core/utils/normalizeError";
import { nowIso } from "../../core/utils/time";
import { loadParsedConfigDocument, persistRuntimeState } from "../../core/storage/configStorage";
import { createCompanionClient } from "./companion-client";
import { createToolBroker } from "./tool-broker";

export type ConnectionTestSummary = {
  tested: number;
  connected: number;
  failed: number;
  results: Record<
    string,
    {
      state: ConnectionHealth["state"];
      errorCategory: ConnectionErrorCategory;
      toolCount: number;
    }
  >;
};

export type ConnectionManager = {
  testAllConnections: () => Promise<ConnectionTestSummary>;
};

type ServerTestResult = {
  health: ConnectionHealth;
  tools: BrokerTool[];
};

const createFailedHealth = (
  checkedAt: string,
  error: unknown,
): ConnectionHealth => {
  const normalized = normalizeError(error);
  return {
    state: "failed",
    lastCheckedAt: checkedAt,
    serverInfo: null,
    toolCount: 0,
    capabilities: [],
    errorCategory: normalized.category,
    errorMessage: normalized.message,
  };
};

const createSuccessfulHealth = (
  checkedAt: string,
  initializeResult: McpInitializeResult,
  tools: McpToolDefinition[],
): ConnectionHealth => ({
  state: "connected",
  lastCheckedAt: checkedAt,
  serverInfo: initializeResult.serverInfo ?? null,
  toolCount: tools.length,
  capabilities: Object.keys(initializeResult.capabilities ?? {}),
  errorCategory: null,
  errorMessage: null,
});

const summarizeResults = (
  healthMap: Record<string, ConnectionHealth>,
): ConnectionTestSummary => {
  const entries = Object.entries(healthMap);
  return {
    tested: entries.length,
    connected: entries.filter(([, health]) => health.state === "connected").length,
    failed: entries.filter(([, health]) => health.state !== "connected").length,
    results: Object.fromEntries(
      entries.map(([serverId, health]) => [
        serverId,
        {
          state: health.state,
          errorCategory: health.errorCategory,
          toolCount: health.toolCount,
        },
      ]),
    ),
  };
};

const createServerTester = () => {
  const companionClient = createCompanionClient();
  const toolBroker = createToolBroker();

  const testServer = async (
    serverId: string,
    config: RawMcpServerConfig,
  ): Promise<ServerTestResult> => {
    const checkedAt = nowIso();

    try {
      if (isHttpServerConfig(config)) {
        const allowed = await ensureHostPermission(config.url, true);
        if (!allowed) {
          throw {
            category: "permission",
            message: `Host permission denied for ${config.url}.`,
          };
        }

        const transport = createHttpTransport({
          url: config.url,
          headers: config.headers,
        });
        const initializeResult = await transport.initialize();
        await transport.notifyInitialized();
        const listToolsResult = await transport.listTools();
        return {
          health: createSuccessfulHealth(checkedAt, initializeResult, listToolsResult.tools),
          tools: toolBroker.normalizeDiscoveredTools(serverId, listToolsResult.tools),
        };
      }

      if (isStdioServerConfig(config)) {
        const transport = createCompanionTransport({
          serverId,
          config,
          client: companionClient,
        });
        await transport.spawn();
        const initializeResult = await transport.initialize();
        const listToolsResult = await transport.listTools();
        return {
          health: createSuccessfulHealth(checkedAt, initializeResult, listToolsResult.tools),
          tools: toolBroker.normalizeDiscoveredTools(serverId, listToolsResult.tools),
        };
      }

      throw {
        category: "tool",
        message: `Server ${serverId} is neither HTTP nor stdio.`,
      };
    } catch (error) {
      return {
        health: createFailedHealth(checkedAt, error),
        tools: [],
      };
    }
  };

  return {
    testDocument: async (document: RawMcpConfigDocument) => {
      const healthMap: Record<string, ConnectionHealth> = {};
      const toolCatalog: ToolCatalog = {};

      for (const [serverId, config] of getServerEntries(document)) {
        const result = await testServer(serverId, config);
        healthMap[serverId] = result.health;
        toolCatalog[serverId] = result.tools;
      }

      return { healthMap, toolCatalog };
    },
  };
};

export const createConnectionManager = (): ConnectionManager => {
  const tester = createServerTester();

  return {
    testAllConnections: async () => {
      const document = await loadParsedConfigDocument();
      const { healthMap, toolCatalog } = await tester.testDocument(document);
      await persistRuntimeState({
        document,
        healthMap,
        toolCatalog,
      });
      return summarizeResults(healthMap);
    },
  };
};
