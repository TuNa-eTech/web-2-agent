import { isPlainObject } from "../../shared/lib/objectUtils";
import type { ToolCatalog } from "../../shared/types";

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
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header>
        <h3 style={{ margin: 0, fontSize: 16 }}>Server Index</h3>
        <p style={{ margin: 0, color: "#5f6368", fontSize: 12 }}>
          Stored separately to render safely without decrypting secrets.
        </p>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {serverIndex.length === 0 ? (
          <div style={{ fontSize: 13, color: "#8a9097" }}>No servers indexed yet.</div>
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
                key={id}
                style={{
                  border: "1px solid #e0e4ea",
                  borderRadius: 10,
                  padding: 12,
                  background: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{id}</strong>
                  <span style={{ fontSize: 12, color: "#5f6368" }}>{transport}</span>
                </div>
                <div style={{ fontSize: 12, color: "#5f6368", marginTop: 4 }}>
                  runtime: {runtime} · status: {status} · preset: {preset}
                </div>
                <div style={{ fontSize: 12, color: "#5f6368", marginTop: 4 }}>
                  secrets: {hasSecrets ? "masked" : "none"} · last checked: {lastCheckedAt}
                </div>
                <div style={{ fontSize: 12, color: "#5f6368", marginTop: 4 }}>
                  tools: {toolCount}
                  {toolNames ? ` · ${toolNames}${tools.length > 3 ? ", ..." : ""}` : ""}
                </div>
                {errorCategory || errorMessage ? (
                  <div style={{ fontSize: 12, color: "#b42318", marginTop: 6 }}>
                    {errorCategory ? `${errorCategory}: ` : ""}
                    {errorMessage ?? "Connection failed."}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
