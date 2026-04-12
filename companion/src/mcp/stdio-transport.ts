import { EventEmitter } from "events";
import { LogBuffer } from "../process-manager/log-buffer";
import { CompanionError } from "../types/companion";

type JsonRpcMessage = {
  jsonrpc?: "2.0";
  id?: number | string | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export type StdioProtocolMode = "content-length" | "json-lines";

export class StdioJsonRpcTransport extends EventEmitter {
  private buffer = Buffer.alloc(0);
  private readonly log: LogBuffer;
  private closed = false;

  constructor(
    private readonly readable: NodeJS.ReadableStream,
    private readonly writable: NodeJS.WritableStream,
    log: LogBuffer,
    private readonly protocolMode: StdioProtocolMode
  ) {
    super();
    this.log = log;
    this.readable.on("data", (chunk) => this.handleData(chunk));
    this.readable.on("end", () => this.handleClose("stdout ended"));
    this.readable.on("error", (err) => this.handleClose(`stdout error: ${err.message}`));
  }

  send(message: JsonRpcMessage) {
    if (this.closed) {
      throw new CompanionError("PROCESS_EXITED", "Cannot send to closed transport.");
    }
    const json = JSON.stringify(message);
    this.log.push({
      ts: new Date().toISOString(),
      stream: "stdout",
      message: `>> ${json}`,
    });
    if (this.protocolMode === "json-lines") {
      this.writable.write(`${json}\n`, "utf8");
      return;
    }
    const header = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n`;
    this.writable.write(header, "utf8");
    this.writable.write(json, "utf8");
  }

  close() {
    this.closed = true;
  }

  private handleClose(reason: string) {
    if (this.closed) return;
    this.closed = true;
    this.log.push({
      ts: new Date().toISOString(),
      stream: "system",
      message: `transport closed: ${reason}`,
    });
    this.emit("close", reason);
  }

  private handleData(chunk: Buffer) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.protocolMode === "json-lines") {
      this.consumeJsonLines();
      return;
    }
    this.consumeContentLengthFrames();
  }

  private consumeJsonLines() {
    while (true) {
      const newlineIndex = this.buffer.indexOf(0x0a);
      if (newlineIndex === -1) return;

      const lineBytes = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      const raw = lineBytes.toString("utf8").trim();
      if (!raw) continue;

      this.log.push({
        ts: new Date().toISOString(),
        stream: "stdout",
        message: `<< ${raw}`,
      });
      this.emitParsedMessage(raw);
    }
  }

  private consumeContentLengthFrames() {
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const header = this.buffer.slice(0, headerEnd).toString("utf8");
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (!lengthMatch) {
        this.log.push({
          ts: new Date().toISOString(),
          stream: "system",
          message: `protocol error: missing Content-Length header: ${header}`,
        });
        this.emit(
          "error",
          new CompanionError("MCP_PROTOCOL_ERROR", "Missing Content-Length header.", {
            header,
          })
        );
        this.buffer = Buffer.alloc(0);
        return;
      }

      const contentLength = Number(lengthMatch[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;
      if (this.buffer.length < messageEnd) {
        return;
      }

      const messageBytes = this.buffer.slice(messageStart, messageEnd);
      this.buffer = this.buffer.slice(messageEnd);

      const raw = messageBytes.toString("utf8");
      this.log.push({
        ts: new Date().toISOString(),
        stream: "stdout",
        message: `<< ${raw}`,
      });
      this.emitParsedMessage(raw);
    }
  }

  private emitParsedMessage(raw: string) {
    try {
      const parsed = JSON.parse(raw) as JsonRpcMessage;
      this.emit("message", parsed);
    } catch (err) {
      this.emit(
        "error",
        new CompanionError("MCP_PROTOCOL_ERROR", "Invalid JSON from MCP server.", {
          raw,
          message: err instanceof Error ? err.message : String(err),
          protocolMode: this.protocolMode,
        })
      );
    }
  }
}
