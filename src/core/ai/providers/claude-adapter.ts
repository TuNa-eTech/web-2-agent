import type {
  NormalizedToolCall,
  NormalizedToolDefinition,
} from "../types";
import type {
  ProviderAdapter,
  ProviderRequestContext,
  ProviderStreamEvent,
} from "../provider-types";

export type ClaudeToolDefinition = {
  name: string;
  description?: string;
  input_schema?: unknown;
};

export type ClaudeMessageContent =
  | { type: "text"; text: string }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
    };

export type ClaudeMessage = {
  role: "user" | "assistant";
  content: string | ClaudeMessageContent[];
};

export type ClaudeRequest = {
  model: string;
  system?: string;
  messages: ClaudeMessage[];
  tools?: ClaudeToolDefinition[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
};

export type ClaudeStreamChunk = {
  type?: string;
  delta?: { text?: string };
  content_block?: { type?: string; text?: string; id?: string; name?: string };
  error?: { message?: string; type?: string };
  stop_reason?: string;
};

const toClaudeMessage = (message: {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
}): ClaudeMessage => {
  if (message.role === "assistant") {
    return { role: "assistant", content: message.content };
  }

  if (message.role === "tool") {
    return {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: message.toolCallId ?? "tool",
          content: message.content,
        },
      ],
    };
  }

  return { role: "user", content: message.content };
};

const toClaudeTool = (tool: NormalizedToolDefinition): ClaudeToolDefinition => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.inputSchema ?? {},
});

const parseClaudeStreamChunk = (
  chunk: ClaudeStreamChunk,
): ProviderStreamEvent[] => {
  if (chunk.error) {
    return [
      {
        type: "error",
        error: {
          source: "provider",
          message: chunk.error.message ?? "Claude stream error",
          code: chunk.error.type,
        },
      },
    ];
  }

  const events: ProviderStreamEvent[] = [];
  if (chunk.delta?.text) {
    events.push({ type: "token", delta: chunk.delta.text });
  }

  if (chunk.content_block?.type === "tool_use") {
    const toolCall: NormalizedToolCall = {
      id: chunk.content_block.id ?? "tool",
      name: chunk.content_block.name ?? "unknown_tool",
      arguments: {},
    };
    events.push({ type: "tool-call", call: toolCall });
  }

  if (chunk.stop_reason) {
    events.push({ type: "done", reason: chunk.stop_reason });
  }

  return events;
};

export const ClaudeAdapter: ProviderAdapter<
  ClaudeRequest,
  ClaudeToolDefinition
> = {
  id: "claude",
  displayName: "Claude",
  buildRequest: (context: ProviderRequestContext): ClaudeRequest => {
    const systemPrompt = context.systemPrompt;
    const messages = context.messages.map((message) =>
      toClaudeMessage({
        role: message.role,
        content: message.content,
        toolCallId: message.toolCallId,
      }),
    );

    return {
      model: context.model,
      system: systemPrompt,
      messages,
      tools: context.tools.map(toClaudeTool),
      stream: true,
      temperature: context.temperature,
    };
  },
  mapTools: (tools: NormalizedToolDefinition[]) =>
    tools.map(toClaudeTool),
  parseStreamEvent: (chunk: unknown) =>
    parseClaudeStreamChunk(chunk as ClaudeStreamChunk),
};
