import type {
  ChatOrchestrator,
  ChatOrchestratorDependencies,
  ChatOrchestratorEvent,
  StartTurnInput,
} from "./chat-orchestrator";
import type {
  ChatMessage,
  ConfirmationDecision,
  ConfirmationRequest,
  NormalizedToolCall,
  NormalizedToolResult,
  ProviderId,
} from "./types";
import { GeminiAdapter } from "./providers/gemini-adapter";
import { OpenAiAdapter } from "./providers/openai-adapter";
import type { ProviderAdapter } from "./provider-types";
import { loadProviderSettings } from "../storage/providerStorage";

const MAX_AGENTIC_ITERATIONS = 6; // Safety limit to prevent infinite loops

export class DefaultChatOrchestrator implements ChatOrchestrator {
  private deps: ChatOrchestratorDependencies;
  private cancelledTurns = new Set<string>();
  private confirmationResolvers = new Map<string, (decision: ConfirmationDecision) => void>();

  constructor(deps: ChatOrchestratorDependencies) {
    this.deps = deps;
  }

  submitConfirmation(confirmationId: string, decision: ConfirmationDecision): void {
    const resolve = this.confirmationResolvers.get(confirmationId);
    if (resolve) {
      this.confirmationResolvers.delete(confirmationId);
      resolve(decision);
    }
  }

  cancelTurn(turnId: string): void {
    this.cancelledTurns.add(turnId);
  }

  private waitForConfirmation(
    turnId: string,
    call: NormalizedToolCall,
  ): { event: ChatOrchestratorEvent; decision: Promise<ConfirmationDecision> } {
    const confirmationId = `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const request: ConfirmationRequest = {
      id: confirmationId,
      toolName: call.name,
      namespacedToolName: call.name,
      serverId: "mcp",
      risk: this.deps.broker.toolRisk(call.name),
      reason: `The AI wants to call the MCP tool: **${call.name}**`,
      input: call.arguments,
      requestedAt: this.deps.clock(),
    };
    const decision = new Promise<ConfirmationDecision>((resolve) => {
      this.confirmationResolvers.set(confirmationId, resolve);
    });
    return { event: { type: "confirmation-required", turnId, request }, decision };
  }

  /** Single streaming call to the LLM. Returns tool calls collected in this call. */
  private async *streamOnce(
    turnId: string,
    providerId: ProviderId,
    model: string,
    endpoint: string,
    headers: Record<string, string>,
    adapter: ProviderAdapter<any, any>,
    messages: ChatMessage[],
    tools: StartTurnInput["tools"],
  ): AsyncGenerator<
    ChatOrchestratorEvent | { type: "__tool-result__"; calls: Array<{ call: NormalizedToolCall; result: NormalizedToolResult }> },
    void
  > {
    const requestPayload = adapter.buildRequest({ providerId, model, messages, tools });
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      yield { type: "error", turnId, error: { source: "provider", message: `HTTP ${response.status}: ${errText}` } };
      return;
    }
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // Accumulate tool calls for this pass so we can build the history for the next turn
    const collectedCalls: Array<{ call: NormalizedToolCall; result: NormalizedToolResult }> = [];

    while (true) {
      if (this.cancelledTurns.has(turnId)) {
        yield { type: "done", turnId, reason: "cancelled" };
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let chunkObj: any = null;
        if (trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try { chunkObj = JSON.parse(trimmed.slice(6)); } catch { /* ignore */ }
        }
        if (!chunkObj) continue;

        const events = adapter.parseStreamEvent(chunkObj);
        for (const ev of events) {
          if (ev.type === "token") {
            yield { type: "assistant-token", turnId, messageId: "msg", delta: ev.delta };
          } else if (ev.type === "tool-call") {
            // Pause for user confirmation
            const { event: confirmEvent, decision } = this.waitForConfirmation(turnId, ev.call);
            yield confirmEvent;
            const d = await decision;

            if (d === "denied") {
              const result: NormalizedToolResult = { id: ev.call.id, name: ev.call.name, output: "Cancelled by user.", isError: true };
              collectedCalls.push({ call: ev.call, result });
              yield { type: "tool-result", turnId, result };
            } else {
              yield { type: "tool-call", turnId, call: ev.call };
              const result = await this.deps.broker.executeTool(ev.call);
              collectedCalls.push({ call: ev.call, result });
              yield { type: "tool-result", turnId, result };
            }
          } else if (ev.type === "error") {
            yield { type: "error", turnId, error: ev.error };
          } else if (ev.type === "done" && ev.reason !== "tool_calls") {
            // Only forward "real" done (stop/length), not tool_calls done
            yield { type: "done", turnId, reason: ev.reason };
          }
          // ev.type === "done" && reason === "tool_calls" → suppressed, agentic loop handles it
        }
      }
    }

    // Signal collected tool calls back to the agentic loop
    if (collectedCalls.length > 0) {
      yield { type: "__tool-result__", calls: collectedCalls } as any;
    }
  }

  async *startTurn(input: StartTurnInput): AsyncIterable<ChatOrchestratorEvent> {
    const { turnId, providerId, model, userMessage, history, tools } = input;
    this.cancelledTurns.delete(turnId);

    try {
      const store = await loadProviderSettings();
      const config = store.providers.find((p) => p.providerId === providerId);
      if (!config || !config.enabled) {
        throw new Error(`Provider ${providerId} is not configured or disabled.`);
      }

      let adapter: ProviderAdapter<any, any>;
      if (providerId === "gemini") adapter = GeminiAdapter;
      else if (providerId === "openai") adapter = OpenAiAdapter;
      else throw new Error(`Unknown provider: ${providerId}`);

      let endpoint = "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (providerId === "gemini") {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;
      } else if (providerId === "openai") {
        const base = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
        endpoint = `${base}/chat/completions`;
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      // Start with history provided by UI (does NOT include the current user message),
      // then append the current user message once.
      let messages: ChatMessage[] = [
        ...history,
        { id: `${turnId}-user`, role: "user", content: userMessage, createdAt: this.deps.clock() },
      ];

      // Agentic loop: keep calling the LLM until no tool calls remain (max iterations)
      let assistantText = "";
      for (let iteration = 0; iteration < MAX_AGENTIC_ITERATIONS; iteration++) {
        if (this.cancelledTurns.has(turnId)) break;

        let toolCallsThisPass: Array<{ call: NormalizedToolCall; result: NormalizedToolResult }> = [];
        assistantText = "";

        for await (const ev of this.streamOnce(turnId, providerId, model, endpoint, headers, adapter, messages, tools)) {
          if ((ev as any).type === "__tool-result__") {
            toolCallsThisPass = (ev as any).calls;
          } else {
            if ((ev as ChatOrchestratorEvent).type === "assistant-token") {
              assistantText += (ev as any).delta;
            }
            yield ev as ChatOrchestratorEvent;
          }
        }

        // If no tool calls were made in this pass, we're done
        if (toolCallsThisPass.length === 0) break;

        // Build updated history for the next iteration:
        // 1. Add the assistant message referencing the tool calls it made
        // 2. Add the tool result messages
        messages = [
          ...messages,
          {
            id: `${turnId}-assistant-${iteration}`,
            role: "assistant",
            content: assistantText,
            createdAt: this.deps.clock(),
            toolCalls: toolCallsThisPass.map(({ call }) => ({
              id: call.id,
              name: call.name,
              arguments: call.arguments,
            })),
          },
          ...toolCallsThisPass.map(({ call, result }) => ({
            id: `${turnId}-tool-${call.id}`,
            role: "tool" as const,
            content: typeof result.output === "string" ? result.output : JSON.stringify(result.output),
            createdAt: this.deps.clock(),
            toolCallId: call.id,
            toolName: call.name,
          })),
        ];
      }

      yield { type: "done", turnId, reason: "stop" };

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      yield { type: "error", turnId, error: { source: "unknown", message: errorMessage } };
    }
  }
}
