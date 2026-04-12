import * as React from "react";
import { SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export const ChatComposer = ({ onSend, disabled }: ChatComposerProps) => {
  const [value, setValue] = React.useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <form className="app-surface rounded-xl bg-white/84 p-3" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold tracking-[0.01em]">
              Compose the next turn
            </div>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Keep prompts concise. Tool approvals will surface separately when needed.
            </p>
          </div>
          <Badge variant={disabled ? "warning" : "outline"}>
            {disabled ? "Streaming" : "Ready"}
          </Badge>
        </div>

        <Textarea
          className="min-h-[120px] resize-none border-0 bg-white/74 shadow-none focus-visible:ring-0"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask the assistant to inspect configs, suggest tool flows, or draft the next action..."
          value={value}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Use the send button to dispatch the current turn.
          </p>
          <Button disabled={disabled || !value.trim()} type="submit">
            <SendHorizontal className="size-4" />
            Send
          </Button>
        </div>
      </div>
    </form>
  );
};
