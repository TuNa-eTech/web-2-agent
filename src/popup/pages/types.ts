export type PopupConnectionState =
  | "draft"
  | "connecting"
  | "connected"
  | "degraded"
  | "failed"
  | "disabled";

export type PopupServerStatus = {
  serverId: string;
  name: string;
  preset?: string | null;
  status: PopupConnectionState;
  toolCount: number;
  tools: string[];
  lastCheckedAt?: string | null;
  errorCategory?: string | null;
  errorMessage?: string | null;
};

export type PopupState = {
  servers: PopupServerStatus[];
  now: string;
};
