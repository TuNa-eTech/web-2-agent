import type {
  AiSurfaceError,
  ChatMessage,
  ConfirmationDecision,
  ConfirmationRequest,
  NormalizedToolCall,
  NormalizedToolDefinition,
  NormalizedToolResult,
  ProviderId,
  ToolRisk,
} from "./types";
import type { ProviderAdapter } from "./provider-types";

export type StartTurnInput = {
  turnId: string;
  providerId: ProviderId;
  model: string;
  userMessage: string;
  attachments?: Array<{ data: string; mimeType: string; name: string }>;
  history: ChatMessage[];
  tools: NormalizedToolDefinition[];
  systemPrompt?: string;
  temperature?: number;
};

export type BrokerToolClient = {
  listTools: () => Promise<NormalizedToolDefinition[]>;
  executeTool: (call: NormalizedToolCall) => Promise<NormalizedToolResult>;
  toolRisk: (toolName: string) => ToolRisk;
  requiresConfirmation: (call: NormalizedToolCall) => boolean;
};

export type ChatOrchestratorEvent =
  | { type: "assistant-token"; turnId: string; messageId: string; delta: string }
  | { type: "tool-call"; turnId: string; call: NormalizedToolCall }
  | { type: "tool-result"; turnId: string; result: NormalizedToolResult }
  | { type: "confirmation-required"; turnId: string; request: ConfirmationRequest }
  | { type: "error"; turnId?: string; error: AiSurfaceError }
  | { type: "done"; turnId: string; reason?: string };

export type ChatOrchestratorDependencies = {
  broker: BrokerToolClient;
  clock: () => string;
};

export type ChatOrchestrator = {
  startTurn: (input: StartTurnInput) => AsyncIterable<ChatOrchestratorEvent>;
  submitConfirmation: (
    confirmationId: string,
    decision: ConfirmationDecision,
  ) => Promise<void> | void;
  cancelTurn: (turnId: string) => void;
};
