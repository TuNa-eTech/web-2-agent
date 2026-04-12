import { CompanionError, CompanionResponse } from "../types/companion";

type Handler = (message: unknown) => Promise<CompanionResponse>;
type NativeMessagingResponse = CompanionResponse & { requestId?: string };

const UNKNOWN_SERVER_ID = "unknown";
const hasRequestId = (value: unknown): value is { requestId: string } =>
  !!value &&
  typeof value === "object" &&
  "requestId" in value &&
  typeof (value as { requestId?: unknown }).requestId === "string";

export class NativeMessagingBridge {
  private buffer = Buffer.alloc(0);
  private queue = Promise.resolve();

  constructor(private readonly handler: Handler) {}

  start() {
    process.stdin.on("data", (chunk) => this.handleChunk(chunk));
    process.stdin.on("end", () => this.handleEnd());
    process.stdin.on("error", () => this.handleEnd());
    process.stdin.resume();
  }

  private handleChunk(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32LE(0);
      if (this.buffer.length < 4 + length) {
        return;
      }
      const payload = this.buffer.slice(4, 4 + length);
      this.buffer = this.buffer.slice(4 + length);
      this.enqueuePayload(payload);
    }
  }

  private handleEnd() {
    process.exit(0);
  }

  private enqueuePayload(payload: Buffer) {
    this.queue = this.queue.then(async () => {
      let message: unknown;
      try {
        message = JSON.parse(payload.toString("utf8"));
      } catch (err) {
        const response: NativeMessagingResponse = {
          ok: false,
          serverId: UNKNOWN_SERVER_ID,
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid JSON from native messaging client.",
            details: err instanceof Error ? err.message : String(err),
          },
        };
        this.send(response);
        return;
      }

      try {
        const requestId = hasRequestId(message) ? message.requestId : undefined;
        const response = await this.handler(message);
        this.send(requestId ? { ...response, requestId } : response);
      } catch (err) {
        const error =
          err instanceof CompanionError
            ? err
            : new CompanionError("UNKNOWN_ERROR", "Unhandled companion error.", {
                message: err instanceof Error ? err.message : String(err),
              });
        const requestId = hasRequestId(message) ? message.requestId : undefined;
        const response: NativeMessagingResponse = {
          ok: false,
          serverId: UNKNOWN_SERVER_ID,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        };
        this.send(requestId ? { ...response, requestId } : response);
      }
    });
  }

  private send(response: NativeMessagingResponse) {
    const json = JSON.stringify(response);
    const length = Buffer.byteLength(json);
    const header = Buffer.alloc(4);
    header.writeUInt32LE(length, 0);
    process.stdout.write(Buffer.concat([header, Buffer.from(json, "utf8")]));
  }
}
