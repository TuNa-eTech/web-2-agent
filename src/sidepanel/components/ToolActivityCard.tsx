import { Bot, Clock3, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLabel, formatTimestamp, getToolActivityBadgeVariant } from "@/shared/lib/uiPresentation";
import type { ToolActivity } from "../../core/ai";

type ToolActivityCardProps = {
  activity: ToolActivity;
};

const JsonBlock = ({ label, value }: { label: string; value: unknown }) => (
  <div className="code-panel overflow-hidden rounded-xl">
    <div className="border-b border-border/70 px-4 py-3 text-[11px] font-semibold tracking-[0.02em] text-muted-foreground uppercase">
      {label}
    </div>
    <ScrollArea className="h-36">
      <pre className="m-0 p-4 text-xs leading-6 whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </ScrollArea>
  </div>
);

export const ToolActivityCard = ({ activity }: ToolActivityCardProps) => {
  return (
    <div className="rounded-xl border border-border/80 bg-white/84 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{activity.toolName}</div>
          <div className="text-muted-foreground mt-1 text-xs leading-5">
            {activity.namespacedToolName}
          </div>
        </div>
        <Badge variant={getToolActivityBadgeVariant(activity.status)}>
          {formatLabel(activity.status)}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="status-pill">
          <Server className="size-3.5" />
          <span>{activity.serverId}</span>
        </div>
        <div className="status-pill">
          <Clock3 className="size-3.5" />
          <span>{formatTimestamp(activity.startedAt)}</span>
        </div>
        {activity.endedAt ? (
          <div className="status-pill">
            <Bot className="size-3.5" />
            <span>Finished {formatTimestamp(activity.endedAt)}</span>
          </div>
        ) : null}
      </div>

      {activity.error ? (
        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/7 p-3 text-sm text-destructive">
          <span className="font-semibold">{formatLabel(activity.error.source)}: </span>
          {activity.error.message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {activity.input !== undefined ? <JsonBlock label="Input" value={activity.input} /> : null}
        {activity.output !== undefined ? <JsonBlock label="Output" value={activity.output} /> : null}
      </div>
    </div>
  );
};
