import { Cable, KeyRound, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatLabel, formatTimestamp, getConnectionBadgeVariant } from "@/shared/lib/uiPresentation";
import { isPlainObject } from "../../shared/lib/objectUtils";
import type { ToolCatalog } from "../../shared/types";
import type { PopupConnectionState } from "../../popup/pages/types";

type ServerSummaryListProps = {
  serverIndex: unknown[];
  healthMap: Record<string, unknown>;
  toolCatalog: ToolCatalog;
};

export const ServerSummaryList = ({
  serverIndex,
  healthMap,
  toolCatalog,
}: ServerSummaryListProps) => {
  return (
    <section className="flex h-full flex-col gap-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-foreground text-lg font-semibold">Server Index</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Operational view sourced from the safe index, without decrypting secrets.
            </p>
          </div>
          <Badge variant="outline">{serverIndex.length} servers</Badge>
        </div>
      </header>

      <ScrollArea className="h-[540px] pr-3">
        <div className="grid gap-3">
          {serverIndex.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/90 bg-muted/55 p-5 text-sm text-muted-foreground">
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
              const health = isPlainObject(healthMap[id]) ? healthMap[id] : null;
              const tools = Array.isArray(toolCatalog[id]) ? toolCatalog[id] : [];
              const toolNames = tools
                .slice(0, 3)
                .map((tool) =>
                  isPlainObject(tool) && typeof tool.namespacedName === "string"
                    ? tool.namespacedName
                    : null,
                )
                .filter(Boolean)
                .join(", ");
              const errorCategory =
                health && typeof health.errorCategory === "string" ? health.errorCategory : null;
              const errorMessage =
                health && typeof health.errorMessage === "string" ? health.errorMessage : null;
              const toolCount =
                health && typeof health.toolCount === "number" ? health.toolCount : tools.length;

              return (
                <div
                  className="rounded-[24px] border border-border/80 bg-white/84 p-4 shadow-sm"
                  key={id}
                >
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
                    <Badge variant={getConnectionBadgeVariant(status as PopupConnectionState)}>
                      {formatLabel(status)}
                    </Badge>
                  </div>

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

                  {toolNames ? (
                    <p className="text-muted-foreground mt-4 text-sm leading-6">
                      Top tools: {toolNames}
                      {tools.length > 3 ? ", ..." : ""}
                    </p>
                  ) : null}

                  {errorCategory || errorMessage ? (
                    <div className="mt-4 rounded-[20px] border border-destructive/20 bg-destructive/7 p-3 text-sm text-destructive">
                      <span className="font-semibold">
                        {errorCategory ? `${formatLabel(errorCategory)}: ` : ""}
                      </span>
                      {errorMessage ?? "Connection failed."}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </section>
  );
};
