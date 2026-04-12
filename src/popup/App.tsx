import * as React from "react";
import {
  ArrowUpRight,
  Cable,
  PanelsTopLeft,
  Server,
  Settings2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { loadConnectionHealthMap, loadServerIndex, loadToolCatalog } from "../core/storage/configStorage";
import { deriveAtlassianCapabilities } from "../presets/atlassian/capability-map";
import { deriveAtlassianQuickActions } from "../presets/atlassian/quick-actions";
import { ATLASSIAN_CAPABILITY_LABELS } from "../presets/atlassian/ui/labels";
import { formatLabel, formatTimestamp, getConnectionBadgeVariant } from "../shared/lib/uiPresentation";
import { buildPopupState } from "./pages/popup";
import type { PopupServerStatus, PopupState } from "./pages/types";

const EMPTY_STATE: PopupState = {
  now: new Date().toISOString(),
  servers: [],
};

const PopupSkeleton = () => (
  <div className="grid gap-3">
    <Card className="feature-glow rounded-xl border-white/70">
      <CardHeader className="space-y-4">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </CardHeader>
    </Card>
    <Card className="rounded-xl">
      <CardContent className="space-y-3 pt-6">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </CardContent>
    </Card>
  </div>
);

const PopupServerCard = ({
  server,
  onRunAction,
}: {
  server: PopupServerStatus;
  onRunAction: (serverId: string, actionId: string) => void;
}) => {
  const { detected } = deriveAtlassianCapabilities(server.tools);
  const quickActions = deriveAtlassianQuickActions(server.tools)
    .filter((entry) => entry.available)
    .map((entry) => entry.action);

  return (
    <Card className="rounded-xl bg-white/86">
      <CardHeader className="gap-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-base">{server.name}</CardTitle>
            <CardDescription>
              {server.errorMessage
                ? "Needs attention before the next automation run."
                : "Launch the next relevant Atlassian action directly from the popup."}
            </CardDescription>
          </div>
          <Badge variant={getConnectionBadgeVariant(server.status)}>
            {formatLabel(server.status)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="status-pill">
            <Server className="size-3.5" />
            <span>{server.toolCount} tools</span>
          </div>
          <div className="status-pill">
            <Cable className="size-3.5" />
            <span>{formatTimestamp(server.lastCheckedAt)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from(detected).length > 0 ? (
            Array.from(detected)
              .map((capability) => ATLASSIAN_CAPABILITY_LABELS[capability]?.label)
              .filter((label): label is string => Boolean(label))
              .map((label) => (
                <Badge className="bg-primary/8 text-primary" key={label} variant="secondary">
                  {label}
                </Badge>
              ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No Atlassian capabilities detected yet.
            </p>
          )}
        </div>

        {server.errorCategory || server.errorMessage ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/7 p-4 text-sm text-destructive">
            <div className="font-semibold">
              {server.errorCategory ? formatLabel(server.errorCategory) : "Connection error"}
            </div>
            {server.errorMessage ? (
              <div className="mt-1 text-destructive/90">{server.errorMessage}</div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2">
          {quickActions.length > 0 ? (
            quickActions.map((action, index) => (
              <Button
                className="h-auto justify-between rounded-lg px-4 py-3 text-left"
                key={action.id}
                onClick={() => onRunAction(server.serverId, action.id)}
                variant={index === 0 ? "default" : "outline"}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{action.title}</div>
                  {index === 0 ? (
                    <div className="text-primary-foreground/82 text-left text-xs leading-5">
                      {action.description}
                    </div>
                  ) : null}
                </div>
                <ArrowUpRight className="size-4 shrink-0" />
              </Button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/90 bg-muted/55 px-4 py-4 text-sm text-muted-foreground">
              Quick actions will appear here after the server exposes compatible tools.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
  const connectedCount = atlassianServers.filter((server) => server.status === "connected").length;
  const toolCount = atlassianServers.reduce((total, server) => total + server.toolCount, 0);

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
    <div className="min-h-[520px] p-3">
      <div className="mx-auto flex h-full max-h-[520px] flex-col gap-3">
        <Card className="feature-glow rounded-xl border-white/70">
          <CardHeader className="gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge className="bg-white/72 text-primary shadow-sm" variant="secondary">
                  Atlassian preset
                </Badge>
                <div>
                  <CardTitle className="text-lg">Command Deck</CardTitle>
                  <CardDescription className="mt-1 max-w-[280px] text-xs">
                    Keep the popup lean, surface the next best action, and send deeper work to the
                    AI workspace.
                  </CardDescription>
                </div>
              </div>
              <Button onClick={openOptions} size="icon" variant="ghost">
                <Settings2 className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/65 bg-white/74 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3 text-primary" />
                  Ready servers
                </div>
                <div className="mt-1 text-2xl font-semibold">{connectedCount}</div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {atlassianServers.length} configured · updated {formatTimestamp(state.now)}
                </p>
              </div>
              <div className="rounded-lg border border-white/65 bg-white/74 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <WandSparkles className="size-3 text-primary" />
                  Available tools
                </div>
                <div className="mt-1 text-2xl font-semibold">{toolCount}</div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Prioritized quick actions for Atlassian workflows.
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-xl bg-white/84">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Workspace shortcuts</CardTitle>
                <CardDescription className="mt-1">
                  Keep one obvious escape hatch to the full surfaces.
                </CardDescription>
              </div>
              <Badge variant="outline">{atlassianServers.length} targets</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <PopupSkeleton />
            ) : atlassianServers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/90 bg-muted/55 p-4 text-sm text-muted-foreground">
                Atlassian preset is not configured yet. Add a server in Config Console to unlock
                quick actions.
              </div>
            ) : (
              <ScrollArea className="h-[248px] pr-3">
                <div className="grid gap-3">
                  {atlassianServers.map((server) => (
                    <PopupServerCard key={server.serverId} onRunAction={runAction} server={server} />
                  ))}
                </div>
              </ScrollArea>
            )}

            <Separator />

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button className="justify-between rounded-lg" onClick={openSidepanel}>
                <span className="inline-flex items-center gap-2">
                  <PanelsTopLeft className="size-4" />
                  Open AI Workspace
                </span>
                <ArrowUpRight className="size-4" />
              </Button>
              <Button className="rounded-lg" onClick={openOptions} variant="outline">
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
