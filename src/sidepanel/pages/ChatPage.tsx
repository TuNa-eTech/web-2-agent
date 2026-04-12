import * as React from "react";
import { ChatShell } from "../components/ChatShell";
import {
  chatReducer,
  createChatState,
  createUserMessage,
} from "../state/chat-state";
import type { ConfirmationDecision } from "../../core/ai";

const SESSION_ID = "sidepanel";

export const ChatPage = () => {
  const [state, dispatch] = React.useReducer(
    chatReducer,
    createChatState(SESSION_ID),
  );

  const handleSend = (message: string) => {
    dispatch({ type: "append-message", message: createUserMessage(message) });
    dispatch({ type: "start-assistant-message" });
  };

  const handleConfirm = (decision: ConfirmationDecision) => {
    dispatch({ type: "set-confirmation", request: null });
    dispatch({
      type: "add-error",
      error: {
        source: decision === "approved" ? "broker" : "unknown",
        message:
          decision === "approved"
            ? "Tool approved by user."
            : "Tool denied by user.",
      },
    });
  };

  return (
    <ChatShell
      state={state}
      onSend={handleSend}
      onConfirmTool={handleConfirm}
    />
  );
};
