export type RawMcpConfigDocument = {
  mcpServers: Record<string, RawMcpServerConfig>;
};

export type RawMcpHttpServerConfig = {
  transport?: "streamable-http";
  url: string;
  headers?: Record<string, string>;
  preset?: string;
};

/**
 * Legacy SSE transport (MCP spec 2024-11-05).
 * Uses a persistent GET /sse stream for server→client messages
 * and a separate POST /messages endpoint for client→server requests.
 * Identified by `transport: "sse"` in the config.
 */
export type RawMcpSseServerConfig = {
  transport: "sse";
  url: string;
  headers?: Record<string, string>;
  preset?: string;
};

export type RawMcpStdioServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  stdioProtocol?: "content-length" | "json-lines" | "auto";
  preset?: string;
};

export type RawMcpServerConfig =
  | RawMcpHttpServerConfig
  | RawMcpSseServerConfig
  | RawMcpStdioServerConfig;


export type ConnectionState =
  | "draft"
  | "connecting"
  | "connected"
  | "degraded"
  | "failed"
  | "disabled";

export type ToolPolicy = {
  serverEnabled: boolean;
  allowedTools: string[];
  blockedTools: string[];
  confirmWrites: boolean;
};

export type NormalizedServerProfile = {
  id: string;
  name: string;
  transport: "streamable-http" | "stdio";
  runtime: "extension-http" | "desktop-companion";
  preset: string | null;
  status: ConnectionState;
  toolPolicy: ToolPolicy;
};

export type EncryptedServerPayload = {
  version: 1;
  cipherText: string;
  iv: string;
  salt: string;
};

export type ServerIndex = {
  id: string;
  name: string;
  preset: string | null;
  transport: "streamable-http" | "stdio";
  runtime: "extension-http" | "desktop-companion";
  status: ConnectionState;
  hasSecrets: boolean;
  lastCheckedAt: string | null;
  url: string | null;
};

export type ConnectionErrorCategory =
  | "permission"
  | "auth"
  | "transport"
  | "companion"
  | "tool"
  | "policy"
  | null;

export type ConnectionHealth = {
  state: ConnectionState;
  lastCheckedAt: string | null;
  serverInfo: {
    name?: string;
    version?: string;
  } | null;
  toolCount: number;
  capabilities: string[];
  errorCategory: ConnectionErrorCategory;
  errorMessage: string | null;
};

export type BrokerTool = {
  serverId: string;
  originalName: string;
  namespacedName: string;
  description: string;
  inputSchema: unknown;
  risk: "read" | "write" | "unknown";
  enabled: boolean;
};

export type ToolCatalog = Record<string, BrokerTool[]>;

export type CompanionEnvelope =
  | { type: "spawn"; serverId: string; config: RawMcpServerConfig }
  | { type: "stop"; serverId: string }
  | { type: "initialize"; serverId: string }
  | { type: "listTools"; serverId: string }
  | { type: "callTool"; serverId: string; toolName: string; input: unknown }
  | { type: "diagnostics"; serverId?: string };

export type CompanionErrorPayload = {
  message: string;
  code?: string;
  details?: unknown;
};

export type CompanionResponse<T = unknown, E = CompanionErrorPayload> =
  | { ok: true; serverId: string; payload: T }
  | { ok: false; serverId: string; error: E };
