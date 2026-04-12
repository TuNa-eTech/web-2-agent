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
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

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

  /** Single streaming call to OpenAI via openai SDK */
  private async *streamOnceOpenAi(
    turnId: string,
    model: string,
    apiKey: string,
    baseUrl: string | undefined,
    messages: ChatMessage[],
    tools: StartTurnInput["tools"],
  ): AsyncGenerator<
    ChatOrchestratorEvent | { type: "__tool-result__"; calls: Array<{ call: NormalizedToolCall; result: NormalizedToolResult }> },
    void
  > {
    const openai = new OpenAI({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: true });
    const context = OpenAiAdapter.buildRequest({ providerId: "openai", model, messages, tools: tools ?? [] });

    // OpenAiRequest matches the payload structure precisely
    const stream = await openai.chat.completions.create({
      model: context.model,
      messages: context.messages as any,
      tools: context.tools as any,
      tool_choice: context.tool_choice as any,
      stream: true,
      temperature: context.temperature,
    });

    const collectedCalls: Array<{ call: NormalizedToolCall; result: NormalizedToolResult }> = [];
    const acc = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of stream) {
      if (this.cancelledTurns.has(turnId)) {
        yield { type: "done", turnId, reason: "cancelled" };
        return;
      }

      if (!chunk.choices || chunk.choices.length === 0) continue;
      const choice = chunk.choices[0];
      const delta = choice.delta;

      if (delta?.content) {
        yield { type: "assistant-token", turnId, messageId: "msg", delta: delta.content };
      }

      if (delta?.tool_calls) {
        for (const fragment of delta.tool_calls) {
          const idx = fragment.index;
          let existing = acc.get(idx);
          if (!existing) {
            existing = { id: fragment.id ?? `tool-${idx}`, name: fragment.function?.name ?? "unknown_tool", args: "" };
            acc.set(idx, existing);
          }
          if (fragment.function?.arguments) {
            existing.args += fragment.function.arguments;
          }
        }
      }

      if ((choice.finish_reason as string) === "tool_calls") {
        for (const entry of Array.from(acc.values())) {
          let parsedArgs: unknown = entry.args;
          try { parsedArgs = JSON.parse(entry.args); } catch {}
          
          const call: NormalizedToolCall = {
            id: entry.id,
            name: entry.name,
            arguments: parsedArgs as Record<string, unknown>,
          };

          const { event: confirmEvent, decision } = this.waitForConfirmation(turnId, call);
          yield confirmEvent;
          const d = await decision;

          if (d === "denied") {
            const result: NormalizedToolResult = { id: call.id, name: call.name, output: "Cancelled by user.", isError: true };
            collectedCalls.push({ call, result });
            yield { type: "tool-result", turnId, result };
          } else {
            yield { type: "tool-call", turnId, call };
            const result = await this.deps.broker.executeTool(call);
            collectedCalls.push({ call, result });
            yield { type: "tool-result", turnId, result };
          }
        }
        acc.clear();
      } else if (choice.finish_reason && (choice.finish_reason as string) !== "tool_calls") {
        yield { type: "done", turnId, reason: choice.finish_reason };
      }
    }

    if (collectedCalls.length > 0) {
      yield { type: "__tool-result__", calls: collectedCalls } as any;
    }
  }

  /** Single streaming call to Gemini via @google/generative-ai SDK */
  private async *streamOnceGemini(
    turnId: string,
    model: string,
    apiKey: string,
    messages: ChatMessage[],
    tools: StartTurnInput["tools"],
  ): AsyncGenerator<
    ChatOrchestratorEvent | { type: "__tool-result__"; calls: Array<{ call: NormalizedToolCall; result: NormalizedToolResult }> },
    void
  > {
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model });
    const context = GeminiAdapter.buildRequest({ providerId: "gemini", model, messages, tools: tools ?? [] });

    const streamResult = await generativeModel.generateContentStream({
      contents: context.contents as any,
      tools: context.tools as any,
    });

    const collectedCalls: Array<{ call: NormalizedToolCall; result: NormalizedToolResult }> = [];

    for await (const chunk of streamResult.stream) {
      if (this.cancelledTurns.has(turnId)) {
        yield { type: "done", turnId, reason: "cancelled" };
        return;
      }

      let text = "";
      try {
        text = chunk.text() || "";
      } catch (e) {
        // SDK throws if there's no text part (e.g. only function calls)
      }

      if (text) {
        yield { type: "assistant-token", turnId, messageId: "msg", delta: text };
      }

      const functionCalls = chunk.functionCalls() ?? [];
      for (const fc of functionCalls) {
        const call: NormalizedToolCall = {
          id: `gemini-${fc.name}`,
          name: fc.name,
          arguments: fc.args as Record<string, unknown>,
        };

        const { event: confirmEvent, decision } = this.waitForConfirmation(turnId, call);
        yield confirmEvent;
        const d = await decision;

        if (d === "denied") {
          const result: NormalizedToolResult = { id: call.id, name: call.name, output: "Cancelled by user.", isError: true };
          collectedCalls.push({ call, result });
          yield { type: "tool-result", turnId, result };
        } else {
          yield { type: "tool-call", turnId, call };
          const result = await this.deps.broker.executeTool(call);
          collectedCalls.push({ call, result });
          yield { type: "tool-result", turnId, result };
        }
      }
      
      // forward done from SDK if applicable, although SDK handles it gracefully.
    }

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

      if (providerId !== "gemini" && providerId !== "openai") {
        throw new Error(`Unknown provider: ${providerId}`);
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

        const streamGen = providerId === "gemini"
          ? this.streamOnceGemini(turnId, model, config.apiKey, messages, tools)
          : this.streamOnceOpenAi(turnId, model, config.apiKey, config.baseUrl, messages, tools);

        for await (const ev of streamGen) {
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
