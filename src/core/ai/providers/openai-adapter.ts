import type {
  NormalizedToolCall,
  NormalizedToolDefinition,
} from "../types";
import type {
  ProviderAdapter,
  ProviderRequestContext,
  ProviderStreamEvent,
} from "../provider-types";

export type OpenAiMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> }
  | { role: "assistant"; content: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }
  | { role: "tool"; content: string; tool_call_id: string };

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
        index?: number;      // position of this tool call in the list
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string };
};

// Module-level accumulator for streaming tool call fragments (keyed by index)
const toolCallAccumulators = new WeakMap<object, Map<number, { id: string; name: string; args: string }>>();
const chunkKey = {};  // stable key per import cycle

const getAccumulator = () => {
  if (!toolCallAccumulators.has(chunkKey)) {
    toolCallAccumulators.set(chunkKey, new Map());
  }
  return toolCallAccumulators.get(chunkKey)!;
};

const EMPTY_CONTENT = "";

import type { ChatMessage } from "../types";

const toOpenAiMessage = (message: ChatMessage): OpenAiMessage => {
  // Assistant message with tool calls (function_call response)
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments),
        },
      })),
    };
  }

  // Tool result message
  if (message.role === "tool") {
    return {
      role: "tool",
      content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
      tool_call_id: message.toolCallId ?? "",
    };
  }

  if (message.role === "user" && message.attachments && message.attachments.length > 0) {
    const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
    if (message.content) {
      parts.push({ type: "text", text: message.content });
    }
    for (const att of message.attachments) {
      if (att.mimeType.startsWith("image/")) {
        const b64Data = att.data.includes("base64,") ? att.data : `data:${att.mimeType};base64,${att.data}`;
        parts.push({ type: "image_url", image_url: { url: b64Data } });
      }
    }
    if (parts.length === 0) {
      parts.push({ type: "text", text: "" });
    }
    return { role: "user", content: parts };
  }

  // Regular system/user/assistant
  return {
    role: message.role as "system" | "user" | "assistant",
    content: message.content ?? "",
  };
};

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
  const acc = getAccumulator();
  const choices = chunk.choices ?? [];

  choices.forEach((choice) => {
    const delta = choice.delta;

    // Text token
    if (delta?.content) {
      events.push({ type: "token", delta: delta.content });
    }

    // Accumulate streaming tool_call fragments by index
    if (delta?.tool_calls) {
      delta.tool_calls.forEach((fragment) => {
        const idx = fragment.index ?? 0;
        const existing = acc.get(idx);
        if (existing) {
          // Append argument fragment to existing accumulation
          existing.args += fragment.function?.arguments ?? "";
        } else {
          // First chunk for this tool call — initialise entry
          acc.set(idx, {
            id: fragment.id ?? `tool-${idx}`,
            name: fragment.function?.name ?? "unknown_tool",
            args: fragment.function?.arguments ?? "",
          });
        }
      });
    }

    // When streaming ends for this choice, flush complete tool calls
    if (choice.finish_reason === "tool_calls") {
      acc.forEach((entry) => {
        if (entry.name && entry.name !== "unknown_tool") {
          events.push({
            type: "tool-call",
            call: {
              id: entry.id,
              name: entry.name,
              arguments: parseToolArguments(entry.args),
            },
          });
        }
      });
      acc.clear();
      events.push({ type: "done", reason: "tool_calls" });
    }

    if (choice.finish_reason && choice.finish_reason !== "tool_calls") {
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
    const systemMessages: OpenAiMessage[] = context.systemPrompt
      ? [{ role: "system", content: context.systemPrompt }]
      : [];

    const messages = context.messages.map((m) => toOpenAiMessage(m));

    return {
      model: context.model,
      messages: [...systemMessages, ...messages],
      tools: context.tools.length ? context.tools.map(toOpenAiTool) : undefined,
      tool_choice: context.tools.length ? "auto" : undefined,
      stream: true,
      temperature: context.temperature,
    };
  },
  mapTools: (tools: NormalizedToolDefinition[]) =>
    tools.map(toOpenAiTool),
  parseStreamEvent: (chunk: unknown) =>
    parseOpenAiStreamChunk(chunk as OpenAiStreamChunk),
};
