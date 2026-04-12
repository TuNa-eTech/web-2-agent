import type {
  AiSurfaceError,
  ChatMessage,
  NormalizedToolCall,
  NormalizedToolDefinition,
  NormalizedToolResult,
  ProviderId,
} from "./types";

export type ProviderRequestContext = {
  providerId: ProviderId;
  model: string;
  messages: ChatMessage[];
  tools: NormalizedToolDefinition[];
  systemPrompt?: string;
  temperature?: number;
  metadata?: Record<string, unknown>;
};

export type ProviderStreamEvent =
  | { type: "token"; delta: string }
  | { type: "tool-call"; call: NormalizedToolCall }
  | { type: "tool-result"; result: NormalizedToolResult }
  | { type: "error"; error: AiSurfaceError }
  | { type: "done"; reason?: string };

export type ProviderAdapter<RequestShape = unknown, ToolShape = unknown> = {
  id: ProviderId;
  displayName: string;
  buildRequest: (context: ProviderRequestContext) => RequestShape;
  mapTools: (tools: NormalizedToolDefinition[]) => ToolShape[];
  parseStreamEvent: (chunk: unknown) => ProviderStreamEvent[];
};
