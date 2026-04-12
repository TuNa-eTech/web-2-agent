import type {
  AiSurfaceError,
  ChatMessage,
  ChatState,
  ConfirmationRequest,
  NormalizedToolResult,
  ProviderId,
  ToolActivity,
} from "../../core/ai";

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export type ChatAction =
  | { type: "set-provider"; providerId: ProviderId; model: string }
  | { type: "append-message"; message: ChatMessage }
  | { type: "start-assistant-message"; messageId?: string }
  | { type: "append-assistant-delta"; messageId: string; delta: string }
  | { type: "finalize-assistant-message"; messageId: string }
  | { type: "tool-activity"; activity: ToolActivity }
  | { type: "tool-result"; result: NormalizedToolResult }
  | { type: "set-confirmation"; request: ConfirmationRequest | null }
  | { type: "add-error"; error: AiSurfaceError }
  | { type: "reset-streaming" };

export const createChatState = (sessionId: string): ChatState => ({
  sessionId,
  providerId: null,
  model: null,
  messages: [],
  toolActivity: [],
  pendingConfirmation: null,
  streaming: {
    activeTurnId: null,
    activeMessageId: null,
    status: "idle",
  },
  errors: [],
});

const appendMessage = (state: ChatState, message: ChatMessage): ChatState => ({
  ...state,
  messages: [...state.messages, message],
});

const updateMessage = (
  state: ChatState,
  messageId: string,
  updater: (message: ChatMessage) => ChatMessage,
): ChatState => ({
  ...state,
  messages: state.messages.map((message) =>
    message.id === messageId ? updater(message) : message,
  ),
});

const upsertToolActivity = (
  state: ChatState,
  activity: ToolActivity,
): ChatState => {
  const existing = state.toolActivity.find((item) => item.id === activity.id);
  if (existing) {
    return {
      ...state,
      toolActivity: state.toolActivity.map((item) =>
        item.id === activity.id ? activity : item,
      ),
    };
  }
  return { ...state, toolActivity: [activity, ...state.toolActivity] };
};

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "set-provider":
      return {
        ...state,
        providerId: action.providerId,
        model: action.model,
      };
    case "append-message":
      return appendMessage(state, action.message);
    case "start-assistant-message": {
      const messageId = action.messageId ?? createId();
      const message: ChatMessage = {
        id: messageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "streaming",
      };
      return {
        ...appendMessage(state, message),
        streaming: {
          ...state.streaming,
          activeMessageId: messageId,
          status: "streaming",
        },
      };
    }
    case "append-assistant-delta":
      return updateMessage(state, action.messageId, (message) => ({
        ...message,
        content: `${message.content}${action.delta}`,
        status: "streaming",
      }));
    case "finalize-assistant-message":
      return {
        ...updateMessage(state, action.messageId, (message) => ({
          ...message,
          status: "complete",
        })),
        streaming: {
          ...state.streaming,
          activeMessageId: null,
          status: "idle",
        },
      };
    case "tool-activity":
      return upsertToolActivity(state, action.activity);
    case "tool-result":
      return {
        ...state,
        toolActivity: state.toolActivity.map((activity) =>
          activity.id === action.result.id
            ? {
                ...activity,
                status: action.result.isError ? "failed" : "succeeded",
                output: action.result.output,
                endedAt: new Date().toISOString(),
              }
            : activity,
        ),
      };
    case "set-confirmation":
      return {
        ...state,
        pendingConfirmation: action.request,
      };
    case "add-error":
      return { ...state, errors: [action.error, ...state.errors] };
    case "reset-streaming":
      return {
        ...state,
        streaming: {
          activeTurnId: null,
          activeMessageId: null,
          status: "idle",
        },
      };
    default:
      return state;
  }
};

export const createUserMessage = (content: string): ChatMessage => ({
  id: createId(),
  role: "user",
  content,
  createdAt: new Date().toISOString(),
  status: "complete",
});

export const createAssistantShell = (): ChatMessage => ({
  id: createId(),
  role: "assistant",
  content: "",
  createdAt: new Date().toISOString(),
  status: "streaming",
});
