import type {
  NormalizedToolCall,
  NormalizedToolDefinition,
} from "../types";
import type {
  ProviderAdapter,
  ProviderRequestContext,
  ProviderStreamEvent,
} from "../provider-types";

export type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
};

export type OpenAiToolDefinition = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: unknown;
  };
};

export type OpenAiRequest = {
  model: string;
  messages: OpenAiMessage[];
  tools?: OpenAiToolDefinition[];
  tool_choice?: "auto" | "none";
  stream?: boolean;
  temperature?: number;
};

export type OpenAiStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string };
};

const EMPTY_CONTENT = "";

const toOpenAiMessage = (message: {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
}): OpenAiMessage => ({
  role: message.role,
  content: message.content ?? EMPTY_CONTENT,
  tool_call_id: message.toolCallId,
  name: message.toolName,
});

const toOpenAiTool = (
  tool: NormalizedToolDefinition,
): OpenAiToolDefinition => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema ?? {},
  },
});

const parseToolArguments = (raw: string | undefined): unknown => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const toToolCall = (
  call: { id?: string; function?: { name?: string; arguments?: string } },
  fallbackId: string,
): NormalizedToolCall => ({
  id: call.id ?? fallbackId,
  name: call.function?.name ?? "unknown_tool",
  arguments: parseToolArguments(call.function?.arguments),
});

const parseOpenAiStreamChunk = (
  chunk: OpenAiStreamChunk,
): ProviderStreamEvent[] => {
  if (chunk.error) {
    return [
      {
        type: "error",
        error: {
          source: "provider",
          message: chunk.error.message ?? "OpenAI stream error",
          code: chunk.error.code,
        },
      },
    ];
  }

  const events: ProviderStreamEvent[] = [];
  const choices = chunk.choices ?? [];
  choices.forEach((choice, index) => {
    const delta = choice.delta;
    if (delta?.content) {
      events.push({ type: "token", delta: delta.content });
    }
    if (delta?.tool_calls) {
      delta.tool_calls.forEach((call, toolIndex) => {
        events.push({
          type: "tool-call",
          call: toToolCall(call, `tool-${index}-${toolIndex}`),
        });
      });
    }
    if (choice.finish_reason) {
      events.push({ type: "done", reason: choice.finish_reason });
    }
  });

  return events;
};

export const OpenAiAdapter: ProviderAdapter<
  OpenAiRequest,
  OpenAiToolDefinition
> = {
  id: "openai",
  displayName: "OpenAI",
  buildRequest: (context: ProviderRequestContext): OpenAiRequest => {
    const systemMessages = context.systemPrompt
      ? [
          toOpenAiMessage({
            role: "system",
            content: context.systemPrompt,
          }),
        ]
      : [];

    const messages = context.messages.map((message) =>
      toOpenAiMessage({
        role: message.role,
        content: message.content,
        toolCallId: message.toolCallId,
        toolName: message.toolName,
      }),
    );

    return {
      model: context.model,
      messages: [...systemMessages, ...messages],
      tools: context.tools.map(toOpenAiTool),
      tool_choice: context.tools.length ? "auto" : "none",
      stream: true,
      temperature: context.temperature,
    };
  },
  mapTools: (tools: NormalizedToolDefinition[]) =>
    tools.map(toOpenAiTool),
  parseStreamEvent: (chunk: unknown) =>
    parseOpenAiStreamChunk(chunk as OpenAiStreamChunk),
};
