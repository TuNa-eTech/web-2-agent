import type {
  CompanionEnvelope,
  CompanionResponse,
  RawMcpServerConfig,
} from "../../shared/types";
import type {
  McpCallToolResult,
  McpInitializeResult,
  McpListToolsResult,
} from "./types";
import { normalizeError } from "../utils/normalizeError";
import { NativeBridgeClient } from "../messaging/nativeBridgeClient";

export type CompanionTransportOptions = {
  serverId: string;
  config: RawMcpServerConfig;
  client: NativeBridgeClient;
};

export type CompanionTransport = {
  spawn: () => Promise<void>;
  initialize: () => Promise<McpInitializeResult>;
  listTools: () => Promise<McpListToolsResult>;
  callTool: (toolName: string, input: unknown) => Promise<McpCallToolResult>;
};

const unwrapResponse = <T>(response: CompanionResponse<T>): T => {
  if (response.ok) {
    return response.payload as T;
  }
  throw normalizeError({
    category: "companion",
    message: response.error.message,
    code: response.error.code,
    details: response.error.details,
  });
};

const buildEnvelope = (
  type: CompanionEnvelope["type"],
  serverId: string,
  config?: RawMcpServerConfig,
  toolName?: string,
  input?: unknown
): CompanionEnvelope => {
  if (type === "spawn") {
    return { type, serverId, config: config as RawMcpServerConfig };
  }
  if (type === "callTool") {
    return {
      type,
      serverId,
      toolName: toolName as string,
      input,
    };
  }
  if (type === "diagnostics") {
    return { type, serverId };
  }
  return { type, serverId } as CompanionEnvelope;
};

export const createCompanionTransport = (
  options: CompanionTransportOptions
): CompanionTransport => {
  const { serverId, config, client } = options;

  const send = async <T>(envelope: CompanionEnvelope): Promise<T> => {
    const response = await client.send(envelope);
    return unwrapResponse<T>(response);
  };

  return {
    spawn: async () => {
      await send<void>(buildEnvelope("spawn", serverId, config));
    },
    initialize: async () =>
      send<McpInitializeResult>(buildEnvelope("initialize", serverId)),
    listTools: async () =>
      send<McpListToolsResult>(buildEnvelope("listTools", serverId)),
    callTool: async (toolName, input) =>
      send<McpCallToolResult>(
        buildEnvelope("callTool", serverId, undefined, toolName, input)
      ),
  };
};
