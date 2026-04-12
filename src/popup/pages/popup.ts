import type { ToolCatalog } from "../../shared/types";
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
