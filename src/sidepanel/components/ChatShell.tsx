import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLabel } from "@/shared/lib/uiPresentation";
import type {
  AiSurfaceError,
  ChatState,
  ConfirmationDecision,
  ToolActivity,
} from "../../core/ai";
import { ChatComposer } from "./ChatComposer";
import { ChatTranscript } from "./ChatTranscript";
import { ConfirmationGateCard } from "./ConfirmationGateCard";
import { ToolActivityCard } from "./ToolActivityCard";

type ChatShellProps = {
  state: ChatState;
  onSend: (message: string) => void;
  onConfirmTool: (decision: ConfirmationDecision) => void;
};

const ErrorNotice = ({ error }: { error: AiSurfaceError }) => (
  <div className="rounded-xl border border-destructive/20 bg-destructive/7 p-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 size-5 text-destructive" />
      <div>
        <div className="text-sm font-semibold text-destructive">
          {formatLabel(error.source)}
        </div>
        <div className="mt-1 text-sm text-destructive/90">{error.message}</div>
      </div>
    </div>
  </div>
);

const ToolActivityList = ({ items }: { items: ToolActivity[] }) => (
  <div className="app-surface flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl bg-white/86">
    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
      <div>
        <div className="text-sm font-semibold tracking-[0.01em]">Tool Activity</div>
        <p className="text-muted-foreground mt-1 text-sm">
          Inspect queue state, payloads, outputs, and failures in one place.
        </p>
      </div>
      <Badge variant="outline">{items.length} events</Badge>
    </div>
    <ScrollArea className="min-h-0 flex-1 pr-3">
      <div className="grid gap-3 p-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/90 bg-muted/55 p-4 text-sm text-muted-foreground">
            No tool activity yet.
          </div>
        ) : (
          items.map((activity) => (
            <ToolActivityCard activity={activity} key={activity.id} />
          ))
        )}
      </div>
    </ScrollArea>
  </div>
);

export const ChatShell = ({
  state,
  onSend,
  onConfirmTool,
}: ChatShellProps) => {
  const activeToolCount = state.toolActivity.filter((activity) =>
    ["queued", "running", "awaiting-confirmation"].includes(activity.status),
  ).length;
  const streamingBadgeVariant =
    state.streaming.status === "error"
      ? "destructive"
      : state.streaming.status === "streaming" || state.streaming.status === "waiting"
        ? "warning"
        : "outline";

  return (
    <div className="min-h-screen p-3 md:p-4">
      <Card className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1320px] flex-col rounded-xl bg-white/86 md:min-h-[calc(100vh-2rem)]">
        <CardHeader className="feature-glow gap-4 border-b border-white/70 pb-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-2">
              <Badge className="bg-white/72 text-primary" variant="secondary">
                AI workspace
              </Badge>
              <div>
                <CardTitle className="text-xl sm:text-2xl">
                  Assist, inspect, approve
                </CardTitle>
                <CardDescription className="mt-1 max-w-2xl text-sm leading-6">
                  Keep the conversation readable, separate tool execution from chat intent, and
                  require an explicit decision whenever the workflow reaches a risky action.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{state.providerId ?? "No provider"}</Badge>
              {state.model ? <Badge variant="outline">{state.model}</Badge> : null}
              <Badge variant={streamingBadgeVariant}>
                {formatLabel(state.streaming.status)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 rounded-lg border border-white/65 bg-white/72 p-3 shadow-sm min-w-[200px]">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Bot className="size-3 text-primary" />
                Messages
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-xl font-semibold">{state.messages.length}</div>
                <div className="text-xs text-muted-foreground">in session</div>
              </div>
            </div>
            <div className="flex-1 rounded-lg border border-white/65 bg-white/72 p-3 shadow-sm min-w-[200px]">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Wrench className="size-3 text-primary" />
                Active tools
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-xl font-semibold">{activeToolCount}</div>
                <div className="text-xs text-muted-foreground">queued/running</div>
              </div>
            </div>
            <div className="flex-1 rounded-lg border border-white/65 bg-white/72 p-3 shadow-sm min-w-[200px]">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3 text-primary" />
                Approval gate
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-xl font-semibold">
                  {state.pendingConfirmation ? "Open" : "Clear"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {state.pendingConfirmation ? "waiting" : "none pending"}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-6">
          {state.errors.length > 0 ? (
            <div className="grid gap-3">
              {state.errors.map((error, index) => (
                <ErrorNotice error={error} key={`${error.source}-${index}`} />
              ))}
            </div>
          ) : (
            <div className="status-pill w-fit">
              <CheckCircle2 className="size-3.5 text-success" />
              <span>No runtime errors in this session.</span>
            </div>
          )}

          <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="conversation">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="activity">Tool Activity</TabsTrigger>
            </TabsList>
            <TabsContent className="min-h-0 flex-1" value="conversation">
              <ChatTranscript messages={state.messages} />
            </TabsContent>
            <TabsContent className="min-h-0 flex-1" value="activity">
              <ToolActivityList items={state.toolActivity} />
            </TabsContent>
          </Tabs>

          {state.pendingConfirmation ? (
            <ConfirmationGateCard
              onDecision={onConfirmTool}
              request={state.pendingConfirmation}
            />
          ) : null}

          <ChatComposer
            disabled={state.streaming.status === "streaming"}
            onSend={onSend}
          />
        </CardContent>
      </Card>
    </div>
  );
};
