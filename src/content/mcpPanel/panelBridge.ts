// ---------------------------------------------------------------------------
// Panel Bridge — in-memory event bus connecting responseMonitor → McpPanel
// Runs entirely in content script scope (no cross-context messaging needed).
// ---------------------------------------------------------------------------

import type { ToolExecutionResult } from "../data";

export interface ParsedToolCall {
  toolName: string;
  callId: string;
  args: Record<string, unknown>;
  rawXml: string;
}

export type PanelEvent =
  | { type: "tool-pending"; call: ParsedToolCall }
  | { type: "tool-result"; callId: string; result: ToolExecutionResult }
  | { type: "tool-error"; callId: string; error: string };

type Listener = (event: PanelEvent) => void;

const listeners = new Set<Listener>();

export const panelBridge = {
  emit(event: PanelEvent): void {
    listeners.forEach((l) => l(event));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
