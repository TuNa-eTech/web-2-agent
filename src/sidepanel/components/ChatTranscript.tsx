import * as React from "react";
import type { ChatMessage } from "../../core/ai";
import { ChatMessageBubble } from "./ChatMessageBubble";

type ChatTranscriptProps = {
  messages: ChatMessage[];
};

export const ChatTranscript = ({ messages }: ChatTranscriptProps) => {
  return (
    <div className="ChatTranscript">
      {messages.length === 0 ? (
        <div className="ChatTranscript__empty">
          Start a conversation to see responses here.
        </div>
      ) : null}
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
};
