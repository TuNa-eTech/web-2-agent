import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLabel, formatTimestamp, getRiskBadgeVariant } from "@/shared/lib/uiPresentation";
import type { ConfirmationDecision, ConfirmationRequest } from "../../core/ai";

type ConfirmationGateCardProps = {
  request: ConfirmationRequest;
  onDecision: (decision: ConfirmationDecision) => void;
};

export const ConfirmationGateCard = ({
  request,
  onDecision,
}: ConfirmationGateCardProps) => {
  return (
    <Card className="rounded-xl border-warning/25 bg-warning/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-warning-foreground">
              <ShieldAlert className="size-4" />
              Manual approval required
            </div>
            <div>
              <CardTitle className="text-xl">Confirm tool execution</CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                Review the payload before allowing a risky or unknown tool call to proceed.
              </CardDescription>
            </div>
          </div>
          <Badge variant={getRiskBadgeVariant(request.risk)}>
            {formatLabel(request.risk)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/70 bg-white/70 p-3">
            <div className="text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
              Tool
            </div>
            <div className="mt-2 text-sm font-semibold">{request.toolName}</div>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/70 p-3">
            <div className="text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
              Server
            </div>
            <div className="mt-2 text-sm font-semibold">{request.serverId}</div>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/70 p-3">
            <div className="text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
              Requested
            </div>
            <div className="mt-2 text-sm font-semibold">
              {formatTimestamp(request.requestedAt)}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-white/70 p-3 text-sm leading-6">
          {request.reason}
        </div>

        <div className="code-panel overflow-hidden rounded-xl">
          <div className="border-b border-border/70 px-5 py-3 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
            Payload
          </div>
          <ScrollArea className="h-40">
            <pre className="m-0 p-3 text-xs leading-6 whitespace-pre-wrap break-words">
              {JSON.stringify(request.input, null, 2)}
            </pre>
          </ScrollArea>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onDecision("denied")} type="button" variant="destructive">
            Deny
          </Button>
          <Button onClick={() => onDecision("approved")} type="button">
            Allow tool
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
