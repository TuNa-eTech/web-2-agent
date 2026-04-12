#!/usr/bin/env node
import { NativeMessagingBridge } from "./native-host/native-messaging";
import { ProcessRegistry } from "./process-manager/process-registry";
import {
  CompanionEnvelope,
  CompanionError,
  CompanionErrorPayload,
  CompanionResponse,
  isStdioServerConfig,
} from "./types/companion";
import { buildHostDiagnostics } from "./diagnostics/diagnostics";

const registry = new ProcessRegistry();

const UNKNOWN_SERVER_ID = "unknown";

function ok(serverId: string, payload: unknown): CompanionResponse {
  return { ok: true, serverId, payload };
}

function fail(serverId: string, error: CompanionError): CompanionResponse {
  const payload: CompanionErrorPayload = {
    code: error.code,
    message: error.message,
    details: error.details,
  };
  return { ok: false, serverId, error: payload };
}

async function handleEnvelope(message: unknown): Promise<CompanionResponse> {
  const envelope = message as CompanionEnvelope;
  if (!envelope || typeof envelope !== "object" || !("type" in envelope)) {
    return fail(UNKNOWN_SERVER_ID, new CompanionError("INVALID_REQUEST", "Missing envelope type."));
  }

  const type = (envelope as CompanionEnvelope).type;
  const serverId =
    "serverId" in envelope && typeof (envelope as any).serverId === "string"
      ? (envelope as any).serverId
      : UNKNOWN_SERVER_ID;

  try {
    switch (type) {
      case "spawn": {
        if (serverId === UNKNOWN_SERVER_ID) {
          throw new CompanionError("INVALID_REQUEST", "Missing serverId for spawn.");
        }
        const { config } = envelope as Extract<CompanionEnvelope, { type: "spawn" }>;
        if (!config || !isStdioServerConfig(config)) {
          throw new CompanionError(
            "INVALID_REQUEST",
            "Companion spawn requires a local stdio server config with command/args/env.",
          );
        }
        const result = registry.spawn(serverId, config);
        return ok(serverId, {
          reused: result.reused,
          status: result.handle.status,
        });
      }
      case "stop": {
        if (serverId === UNKNOWN_SERVER_ID) {
          throw new CompanionError("INVALID_REQUEST", "Missing serverId for stop.");
        }
        const handle = registry.stop(serverId);
        return ok(serverId, { status: handle.status });
      }
      case "initialize": {
        if (serverId === UNKNOWN_SERVER_ID) {
          throw new CompanionError("INVALID_REQUEST", "Missing serverId for initialize.");
        }
        const handle = registry.get(serverId);
        const result = await handle.initialize();
        return ok(serverId, result);
      }
      case "listTools": {
        if (serverId === UNKNOWN_SERVER_ID) {
          throw new CompanionError("INVALID_REQUEST", "Missing serverId for listTools.");
        }
        const handle = registry.get(serverId);
        const result = await handle.listTools();
        return ok(serverId, result);
      }
      case "callTool": {
        if (serverId === UNKNOWN_SERVER_ID) {
          throw new CompanionError("INVALID_REQUEST", "Missing serverId for callTool.");
        }
        const { toolName, input } = envelope as Extract<CompanionEnvelope, { type: "callTool" }>;
        if (!toolName) {
          throw new CompanionError("INVALID_REQUEST", "Missing toolName for callTool.");
        }
        const handle = registry.get(serverId);
        const result = await handle.callTool(toolName, input);
        return ok(serverId, result);
      }
      case "diagnostics": {
        const { serverId: requestedServerId } = envelope as Extract<
          CompanionEnvelope,
          { type: "diagnostics" }
        >;
        const snapshot = registry.diagnostics(requestedServerId);
        return ok(requestedServerId ?? "global", {
          host: buildHostDiagnostics(),
          ...snapshot,
        });
      }
      default:
        throw new CompanionError("INVALID_REQUEST", `Unknown envelope type: ${type}`);
    }
  } catch (err) {
    const error =
      err instanceof CompanionError
        ? err
        : new CompanionError("UNKNOWN_ERROR", "Unhandled companion error.", {
            message: err instanceof Error ? err.message : String(err),
          });
    return fail(serverId, error);
  }
}

const bridge = new NativeMessagingBridge(handleEnvelope);
bridge.start();
