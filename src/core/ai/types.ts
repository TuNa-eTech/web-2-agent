export type ProviderId = "openai" | "gemini" | "claude";

export type ToolRisk = "read" | "write" | "unknown";

export type NormalizedToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: unknown;
  risk: ToolRisk;
  serverId: string;
  originalName: string;
};

export type NormalizedToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

export type NormalizedToolResult = {
  id: string;
  name: string;
  output: unknown;
  isError?: boolean;
};

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: "streaming" | "complete" | "error";
  toolCallId?: string;    // for role:"tool" — references the tool call id
  toolName?: string;      // for role:"tool" — tool function name
  /** Set on role:"assistant" messages that issued tool calls */
  toolCalls?: Array<{ id: string; name: string; arguments: unknown }>;
  attachments?: Array<{ data: string; mimeType: string; name: string }>;
  metadata?: Record<string, unknown>;
};

export type ToolActivityStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "blocked"
  | "awaiting-confirmation";

export type ToolActivity = {
  id: string;
  toolName: string;
  namespacedToolName: string;
  serverId: string;
  status: ToolActivityStatus;
  input?: unknown;
  output?: unknown;
  startedAt: string;
  endedAt?: string;
  error?: AiSurfaceError;
};

export type ConfirmationRequest = {
  id: string;
  toolName: string;
  namespacedToolName: string;
  serverId: string;
  risk: ToolRisk;
  reason: string;
  input: unknown;
  requestedAt: string;
};

export type ConfirmationDecision = "approved" | "denied" | "timeout";

export type AiErrorSource = "provider" | "broker" | "mcp" | "unknown";

export type AiSurfaceError = {
  source: AiErrorSource;
  message: string;
  code?: string;
  detail?: unknown;
};

export type ChatStreamingState = {
  activeTurnId: string | null;
  activeMessageId: string | null;
  status: "idle" | "streaming" | "waiting" | "error";
};

export type ChatState = {
  sessionId: string;
  providerId: ProviderId | null;
  model: string | null;
  messages: ChatMessage[];
  toolActivity: ToolActivity[];
  pendingConfirmation: ConfirmationRequest | null;
  streaming: ChatStreamingState;
  errors: AiSurfaceError[];
};
