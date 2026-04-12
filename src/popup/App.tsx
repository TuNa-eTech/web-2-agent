import * as React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  PanelsTopLeft,
  Settings2,
  XCircle,
  Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { loadConnectionHealthMap, loadServerIndex, loadToolCatalog } from "../core/storage/configStorage";
import { deriveAtlassianQuickActions } from "../presets/atlassian/quick-actions";
import { formatLabel } from "../shared/lib/uiPresentation";
import { buildPopupState } from "./pages/popup";
import type { PopupServerStatus, PopupState } from "./pages/types";

const EMPTY_STATE: PopupState = {
  now: new Date().toISOString(),
  servers: [],
};

const PopupSkeleton = () => (
  <div className="flex flex-col gap-4 p-1">
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-16 w-full" />
  </div>
);

const PopupServerCard = ({
  server,
  onRunAction,
}: {
  server: PopupServerStatus;
  onRunAction: (serverId: string, actionId: string) => void;
}) => {
  const quickActions = deriveAtlassianQuickActions(server.tools)
    .filter((entry) => entry.available)
    .map((entry) => entry.action);

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Server className="size-3.5 text-muted-foreground" />
          {server.name}
        </h3>
        {server.status === "connected" ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <XCircle className="size-4 text-destructive" />
        )}
      </div>

      {server.errorCategory || server.errorMessage ? (
        <div className="mt-1 rounded-lg border border-destructive/20 bg-destructive/7 p-3 text-sm text-destructive">
          <div className="font-semibold">
            {server.errorCategory ? formatLabel(server.errorCategory) : "Connection error"}
          </div>
          {server.errorMessage ? (
            <div className="mt-1 text-xs text-destructive/90">{server.errorMessage}</div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 grid gap-2">
        {quickActions.length > 0 ? (
          quickActions.map((action, index) => (
            <Button
              className="h-auto w-full justify-between rounded-lg border bg-background px-3 py-2 text-left shadow-sm hover:bg-accent hover:text-accent-foreground"
              key={action.id}
              onClick={() => onRunAction(server.serverId, action.id)}
              variant="secondary"
            >
              <div className="min-w-0 pr-2">
                <div className="truncate text-[13px] font-medium">{action.title}</div>
                {index === 0 ? (
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {action.description}
                  </div>
                ) : null}
              </div>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border/90 bg-muted/50 p-3 text-center text-xs text-muted-foreground">
            No quick actions available.
          </div>
        )}
      </div>
    </div>
  );
};

export const App = () => {
  const [state, setState] = React.useState<PopupState>(EMPTY_STATE);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const [serverIndex, healthMap, toolCatalog] = await Promise.all([
        loadServerIndex(),
        loadConnectionHealthMap(),
        loadToolCatalog(),
      ]);

      if (cancelled) {
        return;
      }

      setState(buildPopupState(serverIndex, healthMap, toolCatalog));
      setLoading(false);
      chrome.runtime?.sendMessage?.({ type: "popup:ping" });
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const atlassianServers = state.servers.filter((server) => server.preset === "atlassian");

  const openOptions = () => {
    chrome.runtime?.sendMessage?.({ type: "popup:open-options" });
  };

  const openSidepanel = () => {
    chrome.runtime?.sendMessage?.({ type: "popup:open-sidepanel" });
  };

  const runAction = (serverId: string, actionId: string) => {
    chrome.runtime?.sendMessage?.({
      type: "popup:open-sidepanel",
      serverId,
      actionId,
    });
  };

  return (
    <div className="flex h-[520px] max-h-[520px] flex-col bg-background p-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5 text-primary">
            <PanelsTopLeft className="size-4" />
          </div>
          <h1 className="text-[15px] font-semibold tracking-tight">Quick Actions</h1>
          <Badge className="ml-1 px-1.5 py-0 text-[10px] uppercase" variant="secondary">
            {atlassianServers.length}
          </Badge>
        </div>
        <Button className="size-8" onClick={openOptions} size="icon" variant="ghost">
          <Settings2 className="size-4" />
        </Button>
      </div>

      <Separator className="mb-3" />

      {/* Main Content */}
      <ScrollArea className="flex-1 pr-3">
        {loading ? (
          <PopupSkeleton />
        ) : atlassianServers.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No active servers found. Add a server to run quick actions.
          </div>
        ) : (
          <div className="grid gap-3 pb-4">
            {atlassianServers.map((server) => (
              <PopupServerCard key={server.serverId} onRunAction={runAction} server={server} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="mt-auto pt-3">
        <Button className="w-full justify-between rounded-lg shadow-sm" onClick={openSidepanel}>
          <span className="inline-flex items-center gap-2">
            Open AI Workspace
          </span>
          <ArrowUpRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};
