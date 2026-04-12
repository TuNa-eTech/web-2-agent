import type { CompanionEnvelope, CompanionResponse } from "../../shared/types";
import { normalizeError } from "../utils/normalizeError";

type PendingRequest = {
  resolve: (value: CompanionResponse) => void;
  reject: (error: unknown) => void;
  timeoutId: number | null;
};

export type NativeBridgeClientOptions = {
  hostId?: string;
  defaultTimeoutMs?: number;
};

export class NativeBridgeClient {
  private hostId: string;
  private defaultTimeoutMs: number;
  private port: chrome.runtime.Port | null = null;
  private pendingById = new Map<string, PendingRequest>();
  private pendingQueue: PendingRequest[] = [];

  constructor(options?: NativeBridgeClientOptions) {
    this.hostId = options?.hostId ?? "com.myworkflowext.native_bridge";
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 20_000;
  }

  async send(
    envelope: CompanionEnvelope,
    options?: { timeoutMs?: number }
  ): Promise<CompanionResponse> {
    const port = this.ensurePort();
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    return new Promise<CompanionResponse>((resolve, reject) => {
      const pending: PendingRequest = {
        resolve,
        reject,
        timeoutId: timeoutMs
          ? globalThis.setTimeout(() => {
              this.pendingById.delete(requestId);
              const index = this.pendingQueue.indexOf(pending);
              if (index >= 0) {
                this.pendingQueue.splice(index, 1);
              }
              reject(
                normalizeError({
                  category: "companion",
                  message: "Companion request timed out.",
                })
              );
            }, timeoutMs)
          : null,
      };

      this.pendingById.set(requestId, pending);
      this.pendingQueue.push(pending);

      port.postMessage({
        ...envelope,
        requestId,
      });
    });
  }

  disconnect(): void {
    if (this.port) {
      this.port.disconnect();
    }
    this.port = null;
  }

  private ensurePort(): chrome.runtime.Port {
    if (this.port) {
      return this.port;
    }
    if (typeof chrome === "undefined" || !chrome.runtime?.connectNative) {
      throw normalizeError({
        category: "companion",
        message: "Native messaging is not available in this context.",
      });
    }
    this.port = chrome.runtime.connectNative(this.hostId);
    this.port.onMessage.addListener((message) => this.handleMessage(message));
    this.port.onDisconnect.addListener(() => this.handleDisconnect());
    return this.port;
  }

  private handleMessage(
    message: CompanionResponse | (CompanionResponse & { requestId?: string })
  ) {
    const requestId = (message as { requestId?: string }).requestId;
    const pending = requestId ? this.pendingById.get(requestId) : undefined;

    if (pending) {
      this.resolvePending(requestId, pending, message as CompanionResponse);
      return;
    }

    const fifo = this.pendingQueue.shift();
    if (fifo) {
      if (requestId) {
        this.pendingById.delete(requestId);
      }
      this.clearTimeout(fifo);
      fifo.resolve(message as CompanionResponse);
      return;
    }
  }

  private handleDisconnect() {
    const lastErrorMessage = chrome.runtime?.lastError?.message ?? null;
    const lowered = lastErrorMessage?.toLowerCase() ?? "";
    const error =
      lowered.includes("host not found") || lowered.includes("specified native messaging host not found")
        ? normalizeError({
            category: "companion",
            code: "HOST_NOT_REGISTERED",
            message:
              "Desktop companion is not installed or native host is not registered for this Chrome profile.",
            details: {
              nativeHostId: this.hostId,
              chromeMessage: lastErrorMessage,
            },
          })
        : lowered.includes("forbidden")
          ? normalizeError({
              category: "companion",
              code: "HOST_FORBIDDEN",
              message:
                "Desktop companion is registered, but this extension ID is not allowed by the native host manifest.",
              details: {
                nativeHostId: this.hostId,
                chromeMessage: lastErrorMessage,
              },
            })
        : lowered.includes("failed to start")
          ? normalizeError({
              category: "companion",
              code: "HOST_START_FAILED",
              message: "Desktop companion was found but failed to start.",
              details: {
                nativeHostId: this.hostId,
                chromeMessage: lastErrorMessage,
              },
            })
          : lowered.includes("has exited")
            ? normalizeError({
                category: "companion",
                code: "HOST_EXITED",
                message: "Desktop companion started but exited immediately.",
                details: {
                  nativeHostId: this.hostId,
                  chromeMessage: lastErrorMessage,
                },
              })
            : normalizeError({
                category: "companion",
                message: "Companion connection disconnected.",
                details: {
                  nativeHostId: this.hostId,
                  chromeMessage: lastErrorMessage,
                },
              });
    for (const [requestId, pending] of this.pendingById.entries()) {
      this.clearTimeout(pending);
      pending.reject(error);
      this.pendingById.delete(requestId);
    }
    for (const pending of this.pendingQueue.splice(0)) {
      this.clearTimeout(pending);
      pending.reject(error);
    }
    this.port = null;
  }

  private resolvePending(
    requestId: string,
    pending: PendingRequest,
    response: CompanionResponse
  ) {
    this.pendingById.delete(requestId);
    const queueIndex = this.pendingQueue.indexOf(pending);
    if (queueIndex >= 0) {
      this.pendingQueue.splice(queueIndex, 1);
    }
    this.clearTimeout(pending);
    pending.resolve(response);
  }

  private clearTimeout(pending: PendingRequest) {
    if (pending.timeoutId !== null) {
      globalThis.clearTimeout(pending.timeoutId);
    }
  }
}
