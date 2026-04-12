import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/shared/lib/uiPresentation";
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

const bubbleTone: Record<ChatMessage["role"], string> = {
  system: "bg-accent/45 border-accent/70",
  user: "bg-primary text-primary-foreground border-primary/30",
  assistant: "bg-white/88 border-border/80",
  tool: "bg-secondary/75 border-border/80",
};

const badgeTone: Record<ChatMessage["role"], "outline" | "secondary"> = {
  system: "outline",
  user: "secondary",
  assistant: "outline",
  tool: "outline",
};

export const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm",
          bubbleTone[message.role],
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 text-xs",
            isUser ? "text-primary-foreground/78" : "text-muted-foreground",
          )}
        >
          <Badge variant={badgeTone[message.role]}>{roleLabel[message.role]}</Badge>
          {message.toolName ? <span className="font-medium">{message.toolName}</span> : null}
          <span className="ml-auto">{formatTimestamp(message.createdAt)}</span>
        </div>
        <div
          className={cn(
            "mt-3 whitespace-pre-wrap break-words text-sm leading-6",
            isUser ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {message.content || (
            <span className={cn(isUser ? "text-primary-foreground/78" : "text-muted-foreground")}>
              (no content)
            </span>
          )}
        </div>
        {message.status === "streaming" ? <StreamingMessage /> : null}
      </div>
    </div>
  );
};
