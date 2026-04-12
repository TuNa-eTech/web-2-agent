import { MessageSquareDashed, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "../../core/ai";
import { ChatMessageBubble } from "./ChatMessageBubble";

type ChatTranscriptProps = {
  messages: ChatMessage[];
};

export const ChatTranscript = ({ messages }: ChatTranscriptProps) => {
  return (
    <div className="app-surface flex h-full min-h-[420px] flex-col overflow-hidden rounded-[30px] bg-white/86">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div>
          <div className="text-sm font-semibold tracking-[0.01em]">
            Conversation Timeline
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Each turn stays grouped so approvals and tool calls are easier to follow.
          </p>
        </div>
        <Badge variant="outline">{messages.length} messages</Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <div className="flex min-h-[340px] items-center justify-center p-6">
            <div className="flex max-w-md flex-col items-center gap-4 text-center">
              <div className="rounded-full border border-primary/12 bg-primary/8 p-4 text-primary">
                <MessageSquareDashed className="size-8" />
              </div>
              <div>
                <div className="text-lg font-semibold">Start with a grounded request</div>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  Ask for a config review, a safe tool call sequence, or a draft prompt for the
                  current page context.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline">review active servers</Badge>
                <Badge variant="outline">explain available tools</Badge>
                <Badge variant="outline">
                  <Sparkles className="size-3.5" />
                  draft next action
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
