import type { PopupConnectionState } from "../../popup/pages/types";
import type { ToolActivityStatus, ToolRisk } from "../../core/ai";

type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive";

export const formatLabel = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "Not checked yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
};

export const getConnectionBadgeVariant = (
  status: PopupConnectionState,
): BadgeVariant => {
  switch (status) {
    case "connected":
      return "success";
    case "connecting":
    case "degraded":
      return "warning";
    case "failed":
      return "destructive";
    case "disabled":
      return "secondary";
    case "draft":
    default:
      return "outline";
  }
};

export const getToolActivityBadgeVariant = (
  status: ToolActivityStatus,
): BadgeVariant => {
  switch (status) {
    case "succeeded":
      return "success";
    case "running":
    case "queued":
      return "warning";
    case "failed":
      return "destructive";
    case "blocked":
      return "secondary";
    case "awaiting-confirmation":
    default:
      return "outline";
  }
};

export const getRiskBadgeVariant = (risk: ToolRisk): BadgeVariant => {
  switch (risk) {
    case "read":
      return "success";
    case "write":
      return "warning";
    case "unknown":
    default:
      return "outline";
  }
};
