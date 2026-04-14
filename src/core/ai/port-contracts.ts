import type {
  AiSurfaceError,
  ConfirmationDecision,
  ConfirmationRequest,
  NormalizedToolCall,
  NormalizedToolResult,
  ProviderId,
  ToolActivity,
} from "./types";

// The side panel expects a single long-lived port that stays open for the
// duration of a streaming turn. Reconnects should re-emit chat/ready.
export type ChatPortLifecycle =
  | "connecting"
  | "ready"
  | "streaming"
  | "closed"
  | "error";

export type AnswerSuggestion = { label: string; text: string };

export type SidepanelToBackgroundPortMessage =
  | {
      type: "chat/hello";
      sessionId: string;
    }
  | {
      type: "chat/set-provider";
      providerId: ProviderId;
      model: string;
    }
  | {
      type: "chat/start";
      turnId: string;
      message: string;
      model: string;
      providerId: ProviderId;
      conversationId: string;
      history: Array<{ id: string; role: "user" | "assistant"; content: string; attachments?: Array<{ data: string; mimeType: string; name: string }> }>;
      attachments?: Array<{ data: string; mimeType: string; name: string }>;
    }
  | {
      type: "chat/cancel";
      turnId: string;
    }
  | {
      type: "chat/confirm-tool";
      confirmationId: string;
      decision: ConfirmationDecision;
    }
  | {
      type: "chat/suggest-request";
      messageId: string;
      question: string;
    };

export type BackgroundToSidepanelPortMessage =
  | {
      type: "chat/ready";
      sessionId: string;
      lifecycle: ChatPortLifecycle;
    }
  | {
      type: "chat/token";
      turnId: string;
      messageId: string;
      delta: string;
    }
  | {
      type: "chat/tool-call";
      turnId: string;
      call: NormalizedToolCall;
    }
  | {
      type: "chat/tool-result";
      turnId: string;
      result: NormalizedToolResult;
    }
  | {
      type: "chat/tool-activity";
      activity: ToolActivity;
    }
  | {
      type: "chat/confirmation-required";
      turnId: string;
      request: ConfirmationRequest;
    }
  | {
      type: "chat/error";
      turnId?: string;
      error: AiSurfaceError;
    }
  | {
      type: "chat/done";
      turnId: string;
      reason?: string;
    }
  | {
      type: "chat/suggest-result";
      messageId: string;
      suggestions: AnswerSuggestion[];
    };

export type ChatPortMessage =
  | SidepanelToBackgroundPortMessage
  | BackgroundToSidepanelPortMessage;
