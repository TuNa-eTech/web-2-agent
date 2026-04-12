import type { ToolCatalog } from "../../shared/types";
import { renderQuickActionsPanel } from "../components/QuickActionsPanel";
import { renderStatusPanel } from "../components/StatusPanel";
import { el } from "../components/dom";
import { PopupState } from "./types";

const CONNECTION_STATES = new Set([
  "draft",
  "connecting",
  "connected",
  "degraded",
  "failed",
  "disabled",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const asConnectionState = (value: unknown): PopupState["servers"][number]["status"] =>
  typeof value === "string" && CONNECTION_STATES.has(value)
    ? (value as PopupState["servers"][number]["status"])
    : "draft";

const applyBaseStyles = (): void => {
  const style = document.createElement("style");
  style.textContent = `
    :root { color-scheme: light; }
    body { font-family: "Inter", "Segoe UI", sans-serif; margin: 0; background: #f5f6f8; }
    .popup { padding: 16px; display: grid; gap: 12px; width: 360px; }
    .card { background: #ffffff; border-radius: 12px; padding: 12px; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08); }
    .card-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #0f172a; }
    .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .status-dot { width: 8px; height: 8px; border-radius: 999px; background: #94a3b8; }
    .status-connected { background: #22c55e; }
    .status-connecting { background: #f59e0b; }
    .status-degraded { background: #f97316; }
    .status-failed { background: #ef4444; }
    .status-disabled { background: #64748b; }
    .status-label { font-size: 12px; color: #334155; }
    .status-meta { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    .status-error { margin-top: 8px; font-size: 12px; color: #b91c1c; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .badge { background: #e2e8f0; color: #1e293b; font-size: 10px; border-radius: 999px; padding: 4px 8px; }
    .quick-actions { display: grid; gap: 8px; }
    .quick-action { border: 1px solid #e2e8f0; background: #f8fafc; padding: 10px; border-radius: 10px; text-align: left; cursor: pointer; }
    .quick-action:hover { background: #eef2ff; border-color: #c7d2fe; }
    .quick-title { font-size: 12px; font-weight: 600; color: #1e293b; }
    .quick-description { font-size: 11px; color: #64748b; margin-top: 2px; }
    .empty-state { font-size: 12px; color: #94a3b8; }
    .shortcut-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .shortcut-button { border: 1px solid #cbd5e1; background: #ffffff; border-radius: 10px; padding: 10px; font-size: 12px; font-weight: 600; color: #1e293b; cursor: pointer; }
    .shortcut-button:hover { background: #f8fafc; border-color: #94a3b8; }
  `;
  document.head.appendChild(style);
};

export const buildPopupState = (
  serverIndex: unknown[],
  healthMap: Record<string, unknown>,
  toolCatalog: ToolCatalog,
): PopupState => {
  const servers = serverIndex
    .flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      const serverId = asString(entry.id);
      if (!serverId) {
        return [];
      }

      const health = isRecord(healthMap[serverId]) ? healthMap[serverId] : null;
      const tools = Array.isArray(toolCatalog[serverId])
        ? toolCatalog[serverId]
            .map((tool) =>
              isRecord(tool) && typeof tool.namespacedName === "string"
                ? tool.namespacedName
                : null,
            )
            .filter((toolName): toolName is string => Boolean(toolName))
        : [];
      const toolCount = typeof health?.toolCount === "number" ? health.toolCount : tools.length;

      return [
        {
          serverId,
          name: asString(entry.name) ?? serverId,
          preset: asString(entry.preset),
          status: asConnectionState(health?.state ?? entry.status),
          toolCount,
          tools,
          lastCheckedAt: asString(health?.lastCheckedAt ?? entry.lastCheckedAt),
          errorCategory: asString(health?.errorCategory),
          errorMessage: asString(health?.errorMessage),
        },
      ];
    })
    .sort((left, right) => {
      const leftPreset = left.preset === "atlassian" ? 0 : 1;
      const rightPreset = right.preset === "atlassian" ? 0 : 1;
      if (leftPreset !== rightPreset) {
        return leftPreset - rightPreset;
      }
      return left.name.localeCompare(right.name);
    });

  return {
    now: new Date().toISOString(),
    servers,
  };
};

export const renderPopup = (state: PopupState, root: HTMLElement): void => {
  applyBaseStyles();
  root.innerHTML = "";

  const container = el("div", { className: "popup" });
  const atlassianServers = state.servers.filter(
    (server) => server.preset === "atlassian",
  );

  if (atlassianServers.length === 0) {
    container.appendChild(
      el("section", { className: "card" }, [
        el("div", {
          className: "card-title",
          text: "Atlassian preset not configured",
        }),
        el("div", {
          className: "empty-state",
          text: "Add an Atlassian server in the config to unlock quick actions.",
        }),
      ]),
    );
  } else {
    for (const server of atlassianServers) {
      container.appendChild(renderStatusPanel(server));
      container.appendChild(renderQuickActionsPanel(server));
    }
  }

  container.appendChild(
    el("section", { className: "card" }, [
      el("div", { className: "card-title", text: "Open" }),
      el("div", { className: "shortcut-row" }, [
        el(
          "button",
          {
            className: "shortcut-button",
            text: "Options",
            attrs: { id: "open-options", type: "button" },
          },
        ),
        el(
          "button",
          {
            className: "shortcut-button",
            text: "Side panel",
            attrs: { id: "open-sidepanel", type: "button" },
          },
        ),
      ]),
    ]),
  );

  root.appendChild(container);
};
