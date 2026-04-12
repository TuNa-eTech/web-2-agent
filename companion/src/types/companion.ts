export type {
  CompanionEnvelope,
  CompanionErrorPayload,
  CompanionResponse,
  RawMcpServerConfig,
  RawMcpStdioServerConfig,
} from "../../../src/shared/types/mcp-contracts";
import type {
  RawMcpServerConfig,
  RawMcpStdioServerConfig,
} from "../../../src/shared/types/mcp-contracts";

export type CompanionErrorCode =
  | "INVALID_REQUEST"
  | "SERVER_NOT_RUNNING"
  | "SERVER_ALREADY_RUNNING"
  | "SPAWN_FAILED"
  | "COMMAND_NOT_FOUND"
  | "PROCESS_EXITED"
  | "INITIALIZE_FAILED"
  | "TOOLS_LIST_FAILED"
  | "TOOL_CALL_FAILED"
  | "MCP_PROTOCOL_ERROR"
  | "MCP_TIMEOUT"
  | "UNKNOWN_ERROR";

export class CompanionError extends Error {
  code: CompanionErrorCode;
  details?: unknown;

  constructor(code: CompanionErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const isStdioServerConfig = (
  config: RawMcpServerConfig,
): config is RawMcpStdioServerConfig =>
  "command" in config && typeof config.command === "string";
