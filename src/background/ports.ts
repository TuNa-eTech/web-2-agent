import {
  DefaultChatOrchestrator,
  generateAnswerSuggestions,
  type ChatPortMessage,
  type StartTurnInput,
  type NormalizedToolCall,
  type NormalizedToolResult,
  type NormalizedToolDefinition,
  type ToolRisk,
  type BrokerToolClient,
  normalizeBrokerTools,
} from "../core/ai";
import { loadToolCatalog, loadParsedConfigDocument } from "../core/storage/configStorage";
import { loadMcpPreferences } from "../core/storage/mcpPreferences";
import { assembleSystemPrompt } from "../core/skills";
import { createHttpTransport } from "../core/mcp/httpTransport";
import { createCompanionClient } from "./runtime/companion-client";
import { createCompanionTransport } from "../core/mcp/companionTransport";
import { isHttpServerConfig, isStdioServerConfig } from "../shared/lib/configDocument";
import { parseNamespacedToolName } from "../core/utils/namespacing";
import type { BrokerTool, RawMcpConfigDocument } from "../shared/types";

type SidepanelPortMessage =
  | { type: "sidepanel:ping" }
  | { type: "sidepanel:ready" }
  | { type: "sidepanel:stream"; payload: unknown };

// ---------------------------------------------------------------------------
// MCP Broker: loads from storage, executes tools via transport
// ---------------------------------------------------------------------------

type McpBrokerData = {
  tools: NormalizedToolDefinition[];
  allBrokerTools: BrokerTool[];
  document: RawMcpConfigDocument;
};

const loadBrokerData = async (): Promise<McpBrokerData> => {
  const [catalog, , document] = await Promise.all([
    loadToolCatalog(),
    loadMcpPreferences(),
    // Gracefully handle invalid config by falling back to empty
    loadParsedConfigDocument().catch(() => ({ mcpServers: {} } as RawMcpConfigDocument)),
  ]);

  const allBrokerTools: BrokerTool[] = Object.values(catalog).flat();
  const tools = normalizeBrokerTools(
    allBrokerTools.map((t) => ({
      serverId: t.serverId,
      originalName: t.originalName,
      namespacedName: t.namespacedName,
      description: t.description,
      inputSchema: t.inputSchema,
      risk: t.risk,
      enabled: t.enabled,
    })),
  );

  return { tools, allBrokerTools, document };
};

const createMcpBroker = async (): Promise<BrokerToolClient> => {
  const companionClient = createCompanionClient();
  // Load on first creation; tools are re-fetched each turn via listTools()
  let data = await loadBrokerData();

  const executeTool = async (call: NormalizedToolCall): Promise<NormalizedToolResult> => {
    const parsed = parseNamespacedToolName(call.name);
    if (!parsed) {
      return { id: call.id, name: call.name, output: `Cannot parse tool name: ${call.name}`, isError: true };
    }

    const { serverId, originalName } = parsed;
    const serverConfig = data.document.mcpServers?.[serverId];
    if (!serverConfig) {
      return { id: call.id, name: call.name, output: `Server ${serverId} not found in config.`, isError: true };
    }

    try {
      type McpResultShape = { content?: unknown; isError?: boolean };
      let result: McpResultShape;

      if (isHttpServerConfig(serverConfig)) {
        const transport = createHttpTransport({ url: serverConfig.url, headers: serverConfig.headers });
        await transport.initialize();
        await transport.notifyInitialized();
        result = (await transport.callTool(originalName, call.arguments)) as McpResultShape;
      } else if (isStdioServerConfig(serverConfig)) {
        const transport = createCompanionTransport({ serverId, config: serverConfig, client: companionClient });
        await transport.spawn();
        await transport.initialize();
        result = (await transport.callTool(originalName, call.arguments)) as McpResultShape;
      } else {
        return { id: call.id, name: call.name, output: "Unsupported server transport.", isError: true };
      }

      return {
        id: call.id,
        name: call.name,
        output: result.content ?? result,
        isError: result.isError ?? false,
      };
    } catch (e: unknown) {
      return {
        id: call.id,
        name: call.name,
        output: e instanceof Error ? e.message : String(e),
        isError: true,
      };
    }
  };

  return {
    // Reload data on every listTools() call so the LLM gets up-to-date tools
    listTools: async () => {
      data = await loadBrokerData();
      return data.tools;
    },
    executeTool,
    toolRisk: (toolName) => {
      const found = data.allBrokerTools.find((t) => t.namespacedName === toolName);
      return (found?.risk ?? "unknown") as ToolRisk;
    },
    requiresConfirmation: () => false,
  };
};

// ---------------------------------------------------------------------------
// Port router
// ---------------------------------------------------------------------------

export const registerPortRouter = () => {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidepanel") {
      port.onMessage.addListener((message: unknown) => {
        if (!message || typeof message !== "object" || !("type" in message)) return;
        const payload = message as SidepanelPortMessage;
        if (payload.type === "sidepanel:ping") {
          port.postMessage({ type: "sidepanel:ready" } satisfies SidepanelPortMessage);
        }
      });
      port.postMessage({ type: "sidepanel:ready" } satisfies SidepanelPortMessage);
      return;
    }

    if (port.name === "chat-port") {
      let orchestrator: DefaultChatOrchestrator | null = null;
      let broker: BrokerToolClient | null = null;

      // Initialize broker + orchestrator asynchronously
      createMcpBroker()
        .then((b) => {
          broker = b;
          orchestrator = new DefaultChatOrchestrator({
            broker: b,
            clock: () => new Date().toISOString(),
          });
        })
        .catch((e: unknown) => {
          console.error("[ports] Failed to initialize MCP broker:", e);
        });

      port.onMessage.addListener(async (rawMessage: unknown) => {
        const payload = rawMessage as ChatPortMessage;

        if (payload.type === "chat/cancel") {
          orchestrator?.cancelTurn(payload.turnId);
          return;
        }

        if (payload.type === "chat/confirm-tool") {
          orchestrator?.submitConfirmation(payload.confirmationId, payload.decision);
          return;
        }

        if (payload.type === "chat/suggest-request") {
          const messageId = payload.messageId;
          try {
            const suggestions = await generateAnswerSuggestions(payload.question);
            port.postMessage({ type: "chat/suggest-result", messageId, suggestions });
          } catch (e: unknown) {
            console.warn("[ports] suggest-request failed:", e instanceof Error ? e.message : String(e));
            port.postMessage({ type: "chat/suggest-result", messageId, suggestions: [] });
          }
          return;
        }

        if (payload.type === "chat/start") {
          if (!orchestrator || !broker) {
            port.postMessage({
              type: "chat/error",
              error: { source: "unknown", message: "Chat is initializing, please wait a moment and try again." },
            });
            return;
          }

          try {
            // Re-fetch tools; assemble system prompt with tag matching against user message
            const [availableTools, systemPrompt] = await Promise.all([
              broker.listTools(),
              assembleSystemPrompt(payload.message),
            ]);

            const input: StartTurnInput = {
              turnId: payload.turnId,
              providerId: payload.providerId,
              model: payload.model,
              userMessage: payload.message,
              attachments: payload.attachments,
              history: (payload.history ?? []).map((m, i) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
                attachments: m.attachments,
                createdAt: new Date(Date.now() - (payload.history.length - i) * 1000).toISOString(),
              })),
              tools: availableTools,
              systemPrompt,
            };

            for await (const event of orchestrator.startTurn(input)) {
              if (event.type === "assistant-token") {
                port.postMessage({ type: "chat/token", turnId: event.turnId, messageId: event.messageId, delta: event.delta });
              } else if (event.type === "confirmation-required") {
                port.postMessage({ type: "chat/confirmation-required", turnId: event.turnId, request: event.request });
              } else if (event.type === "tool-call") {
                port.postMessage({ type: "chat/tool-call", turnId: event.turnId, call: event.call });
              } else if (event.type === "tool-result") {
                port.postMessage({ type: "chat/tool-result", turnId: event.turnId, result: event.result });
              } else if (event.type === "error") {
                port.postMessage({ type: "chat/error", turnId: event.turnId, error: event.error });
              } else if (event.type === "done") {
                port.postMessage({ type: "chat/done", turnId: event.turnId, reason: event.reason });
              }
            }
          } catch (e: unknown) {
            // Catch any unhandled error in the turn so the SW doesn't crash
            port.postMessage({
              type: "chat/error",
              turnId: payload.turnId,
              error: { source: "unknown", message: e instanceof Error ? e.message : String(e) },
            });
          }
        }
      });

      port.postMessage({ type: "chat/ready", sessionId: "1", lifecycle: "ready" });
    }
  });
};
