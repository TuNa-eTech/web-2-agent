import { CompanionError } from "../types/companion";
import { StdioJsonRpcTransport } from "./stdio-transport";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: CompanionError) => void;
  timeout: NodeJS.Timeout;
};

type JsonRpcMessage = {
  jsonrpc?: "2.0";
  id?: number | string | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export class McpRpcClient {
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private closed = false;

  constructor(private readonly transport: StdioJsonRpcTransport) {
    this.transport.on("message", (message: JsonRpcMessage) => this.handleMessage(message));
    this.transport.on("close", (reason?: string) =>
      this.failAll("PROCESS_EXITED", "MCP process closed.", reason ? { reason } : undefined),
    );
    this.transport.on("error", (error: CompanionError) => {
      this.failAll(error.code, error.message, error.details);
    });
  }

  async request(method: string, params?: unknown, timeoutMs = 15000): Promise<unknown> {
    if (this.closed) {
      throw new CompanionError("PROCESS_EXITED", "MCP process is not available.");
    }
    const id = this.nextId++;
    const message: JsonRpcMessage = { jsonrpc: "2.0", id, method, params };
    const result = new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new CompanionError("MCP_TIMEOUT", `MCP request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
    });
    this.transport.send(message);
    return result;
  }

  notify(method: string, params?: unknown) {
    if (this.closed) {
      throw new CompanionError("PROCESS_EXITED", "MCP process is not available.");
    }
    const message: JsonRpcMessage = { jsonrpc: "2.0", method, params };
    this.transport.send(message);
  }

  close() {
    this.closed = true;
    this.transport.close();
    this.failAll("PROCESS_EXITED", "MCP process closed.");
  }

  private handleMessage(message: JsonRpcMessage) {
    if (message.id === undefined || message.id === null) {
      return;
    }
    const id = typeof message.id === "string" ? Number(message.id) : message.id;
    if (!Number.isFinite(id)) {
      return;
    }
    const pending = this.pending.get(id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(id);
    if (message.error) {
      pending.reject(
        new CompanionError("MCP_PROTOCOL_ERROR", message.error.message, message.error.data)
      );
      return;
    }
    pending.resolve(message.result);
  }

  private failAll(code: CompanionError["code"], message: string, details?: unknown) {
    if (this.closed) return;
    this.closed = true;
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new CompanionError(code, message, details));
      this.pending.delete(id);
    }
  }
}
