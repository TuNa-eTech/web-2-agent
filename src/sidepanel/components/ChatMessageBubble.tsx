import * as React from "react";
import type { ChatMessage } from "../../core/ai";
import { StreamingMessage } from "./StreamingMessage";

type ChatMessageBubbleProps = {
  message: ChatMessage;
};

const roleLabel: Record<ChatMessage["role"], string> = {
  system: "System",
  user: "You",
  assistant: "Assistant",
  tool: "Tool",
};

export const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  return (
    <div className={`ChatMessage ChatMessage--${message.role}`}>
      <div className="ChatMessage__meta">
        <span>{roleLabel[message.role]}</span>
        {message.toolName ? <span>{message.toolName}</span> : null}
      </div>
      <div className="ChatMessage__content">
        {message.content || (
          <span className="ChatMessage__placeholder">(no content)</span>
        )}
      </div>
      {message.status === "streaming" ? <StreamingMessage /> : null}
    </div>
  );
};
