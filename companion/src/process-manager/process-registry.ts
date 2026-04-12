import { CompanionError } from "../types/companion";
import type { RawMcpStdioServerConfig } from "../types/companion";
import { ProcessHandle } from "./process-handle";

export class ProcessRegistry {
  private processes = new Map<string, ProcessHandle>();

  spawn(serverId: string, config: RawMcpStdioServerConfig) {
    const existing = this.processes.get(serverId);
    if (existing && existing.isAlive()) {
      return { reused: true, handle: existing };
    }
    const handle = new ProcessHandle(serverId, config);
    this.processes.set(serverId, handle);
    return { reused: false, handle };
  }

  stop(serverId: string) {
    const handle = this.processes.get(serverId);
    if (!handle) {
      throw new CompanionError("SERVER_NOT_RUNNING", "No running MCP process for serverId.", {
        serverId,
      });
    }
    handle.stop();
    return handle;
  }

  get(serverId: string) {
    const handle = this.processes.get(serverId);
    if (!handle) {
      throw new CompanionError("SERVER_NOT_RUNNING", "No running MCP process for serverId.", {
        serverId,
      });
    }
    return handle;
  }

  diagnostics(serverId?: string) {
    if (serverId) {
      const handle = this.processes.get(serverId);
      if (!handle) {
        throw new CompanionError("SERVER_NOT_RUNNING", "No running MCP process for serverId.", {
          serverId,
        });
      }
      return { server: handle.snapshot(), allServers: [handle.snapshot()] };
    }
    const allServers = [...this.processes.values()].map((handle) => handle.snapshot());
    return { server: null, allServers };
  }
}
