import type {
  NormalizedToolCall,
  NormalizedToolDefinition,
} from "../types";
import type {
  ProviderAdapter,
  ProviderRequestContext,
  ProviderStreamEvent,
} from "../provider-types";

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: unknown } };

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export type GeminiFunctionDeclaration = {
  name: string;
  description?: string;
  parameters?: unknown;
};

export type GeminiToolDefinition = {
  functionDeclarations: GeminiFunctionDeclaration[];
};

export type GeminiRequest = {
  model: string;
  contents: GeminiContent[];
  tools?: GeminiToolDefinition[];
  generationConfig?: {
    temperature?: number;
  };
};

export type GeminiStreamChunk = {
  candidates?: Array<{
    content?: {
      parts?: Array<GeminiPart>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: string };
};

import type { ChatMessage } from "../types";

const toGeminiContent = (message: ChatMessage): GeminiContent => {
  // Assistant message with tool calls
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "model",
      parts: message.toolCalls.map((tc) => ({
        functionCall: {
          name: tc.name,
          args: (typeof tc.arguments === "object" && tc.arguments !== null
            ? tc.arguments
            : {}) as Record<string, unknown>,
        },
      })),
    };
  }

  if (message.role === "assistant") {
    return { role: "model", parts: [{ text: message.content }] };
  }

  // Tool result message
  if (message.role === "tool") {
    return {
      role: "user",
      parts: [
        {
          functionResponse: {
            name: message.toolName ?? "tool",
            response: (() => {
              try {
                const parsed = JSON.parse(message.content);
                if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                  return parsed;
                }
                return { result: parsed };
              } catch {
                return { result: message.content };
              }
            })(),
          },
        },
      ],
    };
  }

  return { role: "user", parts: [{ text: message.content }] };
};

const sanitizeGeminiSchema = (schema: unknown): unknown => {
  if (typeof schema !== "object" || schema === null) return schema;
  if (Array.isArray(schema)) {
    return schema.map(sanitizeGeminiSchema);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties" || key === "$schema") {
      continue;
    }
    result[key] = sanitizeGeminiSchema(value);
  }
  return result;
};

const toGeminiTool = (
  tool: NormalizedToolDefinition,
): GeminiFunctionDeclaration => ({
  name: tool.name,
  description: tool.description,
  parameters: sanitizeGeminiSchema(tool.inputSchema ?? {}),
});

const toToolCall = (call: {
  functionCall?: { name: string; args: Record<string, unknown> };
}): NormalizedToolCall | null => {
  if (!call.functionCall) return null;
  return {
    id: `gemini-${call.functionCall.name}`,
    name: call.functionCall.name,
    arguments: call.functionCall.args ?? {},
  };
};

const parseGeminiStreamChunk = (
  chunk: GeminiStreamChunk,
): ProviderStreamEvent[] => {
  if (chunk.error) {
    return [
      {
        type: "error",
        error: {
          source: "provider",
          message: chunk.error.message ?? "Gemini stream error",
          code: chunk.error.code,
        },
      },
    ];
  }

  const events: ProviderStreamEvent[] = [];
  const candidates = chunk.candidates ?? [];
  candidates.forEach((candidate) => {
    const parts = candidate.content?.parts ?? [];
    parts.forEach((part) => {
      if ("text" in part) {
        events.push({ type: "token", delta: part.text });
      }
      if ("functionCall" in part) {
        const call = toToolCall(part);
        if (call) {
          events.push({ type: "tool-call", call });
        }
      }
    });
    if (candidate.finishReason) {
      events.push({ type: "done", reason: candidate.finishReason });
    }
  });

  return events;
};

export const GeminiAdapter: ProviderAdapter<
  GeminiRequest,
  GeminiToolDefinition
> = {
  id: "gemini",
  displayName: "Gemini",
  buildRequest: (context: ProviderRequestContext): GeminiRequest => {
    const contents = context.messages.map((message) => toGeminiContent(message));

    const tools = context.tools.length
      ? [{ functionDeclarations: context.tools.map(toGeminiTool) }]
      : [];

    return {
      model: context.model,
      contents,
      tools: tools.length ? tools : undefined,
      generationConfig: {
        temperature: context.temperature,
      },
    };
  },
  mapTools: (tools: NormalizedToolDefinition[]) => [
    { functionDeclarations: tools.map(toGeminiTool) },
  ],
  parseStreamEvent: (chunk: unknown) =>
    parseGeminiStreamChunk(chunk as GeminiStreamChunk),
};
