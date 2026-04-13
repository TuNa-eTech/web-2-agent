import * as React from "react";
import { Cable, ChevronDown, ChevronRight, KeyRound, Server, ShieldCheck, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatLabel, formatTimestamp, getConnectionBadgeVariant } from "@/shared/lib/uiPresentation";
import { isPlainObject } from "../../shared/lib/objectUtils";
import type { ToolCatalog } from "../../shared/types";
import type { McpPreferencesMap } from "../../core/storage/mcpPreferences";
import type { PopupConnectionState } from "../../popup/pages/types";

type ServerSummaryListProps = {
  serverIndex: unknown[];
  healthMap: Record<string, unknown>;
  toolCatalog: ToolCatalog;
  mcpPreferences: McpPreferencesMap;
  onToggleServer: (serverId: string, enabled: boolean) => void;
  onToggleTool: (serverId: string, toolName: string, enabled: boolean) => void;
  onTestConnections?: () => void;
};

export const ServerSummaryList = ({
  serverIndex,
  healthMap,
  toolCatalog,
  mcpPreferences,
  onToggleServer,
  onToggleTool,
  onTestConnections,
}: ServerSummaryListProps) => {
  const [expandedServers, setExpandedServers] = React.useState<Record<string, boolean>>({});
  const [grantingFor, setGrantingFor] = React.useState<string | null>(null);

  const toggleExpand = (serverId: string) =>
    setExpandedServers((prev) => ({ ...prev, [serverId]: !prev[serverId] }));

  const handleGrantPermission = async (url: string) => {
    try {
      setGrantingFor(url);
      const origin = `${new URL(url).origin}/*`;
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (granted) {
        // Re-run test immediately so the UI refreshes with the new permission
        onTestConnections?.();
      }
    } finally {
      setGrantingFor(null);
    }
  };

  return (
    <section className="flex h-full flex-col gap-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-foreground text-lg font-semibold">Server Index</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Toggle servers and individual tools on or off. Disabled items won't be
              sent to the inference engine.
            </p>
          </div>
          <Badge variant="outline">{serverIndex.length} servers</Badge>
        </div>
      </header>

      <div>
        <div className="grid gap-3">
          {serverIndex.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/90 bg-muted/55 p-4 text-sm text-muted-foreground">
              No servers indexed yet.
            </div>
          ) : (
            serverIndex.map((entry, index) => {
              if (!isPlainObject(entry)) return null;

              const id = typeof entry.id === "string" ? entry.id : `server-${index + 1}`;
              const transport = typeof entry.transport === "string" ? entry.transport : "unknown";
              const runtime = typeof entry.runtime === "string" ? entry.runtime : "unknown";
              const status = typeof entry.status === "string" ? entry.status : "draft";
              const preset = typeof entry.preset === "string" ? entry.preset : "none";
              const hasSecrets = Boolean(entry.hasSecrets);
              const lastCheckedAt =
                typeof entry.lastCheckedAt === "string" ? entry.lastCheckedAt : "never";
              const entryUrl = typeof entry.url === "string" ? entry.url : null;
              const health = isPlainObject(healthMap[id]) ? healthMap[id] : null;
              const tools = Array.isArray(toolCatalog[id]) ? toolCatalog[id] : [];
              const errorCategory =
                health && typeof health.errorCategory === "string" ? health.errorCategory : null;
              const errorMessage =
                health && typeof health.errorMessage === "string" ? health.errorMessage : null;
              const toolCount =
                health && typeof health.toolCount === "number" ? health.toolCount : tools.length;

              const serverPref = mcpPreferences[id];
              const serverEnabled = serverPref ? serverPref.enabled : true;
              const isExpanded = expandedServers[id] ?? false;

              return (
                <div
                  className={`rounded-xl border border-border/80 p-4 shadow-sm transition-opacity ${
                    serverEnabled ? "bg-white/84" : "bg-muted/40 opacity-70"
                  }`}
                  key={id}
                >
                  {/* ---------- Server header ---------- */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-semibold tracking-[0.01em]">{id}</strong>
                        <Badge variant="outline">{transport}</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        runtime {runtime} · preset {preset}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={getConnectionBadgeVariant(status as PopupConnectionState)}>
                        {serverEnabled ? formatLabel(status) : "Disabled"}
                      </Badge>
                      <Switch
                        checked={serverEnabled}
                        onCheckedChange={(checked) => onToggleServer(id, checked)}
                      />
                    </div>
                  </div>

                  {/* ---------- Status pills ---------- */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="status-pill">
                      <Server className="size-3.5" />
                      <span>{toolCount} tools</span>
                    </div>
                    <div className="status-pill">
                      <Cable className="size-3.5" />
                      <span>{formatTimestamp(lastCheckedAt)}</span>
                    </div>
                    <div className="status-pill">
                      <KeyRound className="size-3.5" />
                      <span>{hasSecrets ? "masked secrets" : "no secrets"}</span>
                    </div>
                  </div>

                  {/* ---------- Tool list toggle ---------- */}
                  {tools.length > 0 && serverEnabled && (
                    <div className="mt-4">
                      <button
                        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => toggleExpand(id)}
                        type="button"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                        <Wrench className="size-3.5" />
                        {tools.length} tool{tools.length !== 1 ? "s" : ""}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 grid gap-1.5 rounded-lg border border-border/60 bg-muted/30 p-3">
                          {tools.map((tool) => {
                            if (!isPlainObject(tool)) return null;
                            const toolOriginalName =
                              typeof tool.originalName === "string" ? tool.originalName : "";
                            const toolNamespaced =
                              typeof tool.namespacedName === "string" ? tool.namespacedName : "";
                            const toolDescription =
                              typeof tool.description === "string" ? tool.description : "";
                            const toolRisk =
                              typeof tool.risk === "string" ? tool.risk : "unknown";
                            const toolEnabled = tool.enabled !== false;

                            // Check user preference for this specific tool.
                            const toolPrefEnabled =
                              serverPref?.toolOverrides?.[toolOriginalName] ?? true;

                            return (
                              <div
                                className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 transition-opacity ${
                                  toolPrefEnabled ? "bg-background/80" : "bg-muted/50 opacity-60"
                                }`}
                                key={toolNamespaced || toolOriginalName}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">
                                      {toolOriginalName}
                                    </span>
                                    <Badge
                                      className="shrink-0 text-[10px]"
                                      variant={
                                        toolRisk === "read"
                                          ? "success"
                                          : toolRisk === "write"
                                            ? "warning"
                                            : "outline"
                                      }
                                    >
                                      {toolRisk}
                                    </Badge>
                                    {!toolEnabled && toolPrefEnabled && (
                                      <Badge className="shrink-0 text-[10px]" variant="secondary">
                                        policy
                                      </Badge>
                                    )}
                                  </div>
                                  {toolDescription && (
                                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                      {toolDescription}
                                    </p>
                                  )}
                                </div>
                                <Switch
                                  checked={toolPrefEnabled}
                                  onCheckedChange={(checked) =>
                                    onToggleTool(id, toolOriginalName, checked)
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---------- Error ---------- */}
                  {(errorCategory || errorMessage) && serverEnabled ? (
                    <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/7 p-3 text-sm text-destructive">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-semibold">
                            {errorCategory ? `${formatLabel(errorCategory)}: ` : ""}
                          </span>
                          {errorMessage ?? "Connection failed."}
                        </div>
                        {errorCategory === "permission" && entryUrl && (
                          <Button
                            className="shrink-0 h-7 gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            disabled={grantingFor === entryUrl}
                            onClick={() => handleGrantPermission(entryUrl)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <ShieldCheck className="size-3.5" />
                            {grantingFor === entryUrl ? "Requesting..." : "Grant Permission"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
