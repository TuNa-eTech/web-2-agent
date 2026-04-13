// ---------------------------------------------------------------------------
// McpPanel — floating overlay panel for MCP tool call confirmation & history
// Mounted into its own Shadow DOM, fixed to bottom-right of the page.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from "react";
import { panelBridge } from "./panelBridge";
import type { ParsedToolCall } from "./panelBridge";
import { executeToolFromContent } from "../data";
import type { ToolExecutionResult } from "../data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToolStatus = "pending" | "running" | "done" | "denied" | "error";

interface ToolCallEntry {
  call: ParsedToolCall;
  status: ToolStatus;
  result?: ToolExecutionResult;
  error?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<ToolStatus, string> = {
  pending: "⏳",
  running: "🔄",
  done: "✅",
  denied: "🚫",
  error: "❌",
};

const STATUS_LABEL: Record<ToolStatus, string> = {
  pending: "Waiting",
  running: "Running…",
  done: "Done",
  denied: "Denied",
  error: "Error",
};

function formatValue(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function formatOutput(output: unknown): string {
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

// ---------------------------------------------------------------------------
// ToolCallCard sub-component
// ---------------------------------------------------------------------------

interface ToolCallCardProps {
  entry: ToolCallEntry;
  onAllow: () => void;
  onDeny: () => void;
  onAttachFile?: () => void;
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({ entry, onAllow, onDeny, onAttachFile }) => {
  const { call, status, result, error } = entry;
  const argEntries = Object.entries(call.args);

  return (
    <div className={`mcp-tool-card mcp-tool-card--${status}`}>
      <div className="mcp-tool-card__header">
        <span className="mcp-tool-card__status-icon">
          {status === "running" ? <span className="mcp-spinner" /> : STATUS_ICON[status]}
        </span>
        <span className="mcp-tool-card__name">{call.toolName}</span>
        <span className="mcp-tool-card__status-text">{STATUS_LABEL[status]}</span>
      </div>

      {argEntries.length > 0 && (
        <div className="mcp-tool-card__args">
          <div className="mcp-tool-card__args-grid">
            {argEntries.map(([k, v]) => (
              <div key={k} className="mcp-tool-card__arg-row">
                <span className="mcp-tool-card__arg-key">{k}:</span>
                <span className="mcp-tool-card__arg-val">{formatValue(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "done" && result?.output !== undefined && (
        <div className="mcp-tool-card__result">
          <div className="mcp-tool-card__result-text">{formatOutput(result.output)}</div>
          {onAttachFile && (
            <div className="mcp-tool-card__actions" style={{ marginTop: "8px" }}>
              <button 
                className="mcp-tool-card__btn mcp-tool-card__btn--allow" 
                onClick={onAttachFile}
                title="Send result as a markdown file attachment"
              >
                📎 Attach Result File
              </button>
            </div>
          )}
        </div>
      )}

      {status === "error" && error && (
        <div className="mcp-tool-card__error">{error}</div>
      )}

      {status === "pending" && (
        <div className="mcp-tool-card__actions">
          <button className="mcp-tool-card__btn mcp-tool-card__btn--allow" onClick={onAllow}>
            ✓ Allow
          </button>
          <button className="mcp-tool-card__btn mcp-tool-card__btn--deny" onClick={onDeny}>
            ✕ Deny
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main panel component
// ---------------------------------------------------------------------------

interface McpPanelProps {
  onInsertText: (text: string) => void;
  onInjectFile?: (content: string, filename: string) => Promise<"file" | "text">;
}

const STORAGE_KEY_AUTO = "mcp_panel_auto_execute";

export const McpPanel: React.FC<McpPanelProps> = ({ onInsertText, onInjectFile }) => {
  const [entries, setEntries] = useState<ToolCallEntry[]>([]);
  const [collapsed, setCollapsed] = useState(true);
  const [autoExecute, setAutoExecute] = useState(false);

  // Keep a ref so the panelBridge subscriber closure always sees the latest value
  const autoExecuteRef = useRef(autoExecute);
  const onInsertTextRef = useRef(onInsertText);
  const onInjectFileRef = useRef(onInjectFile);

  useEffect(() => { autoExecuteRef.current = autoExecute; }, [autoExecute]);
  useEffect(() => { onInsertTextRef.current = onInsertText; }, [onInsertText]);
  useEffect(() => { onInjectFileRef.current = onInjectFile; }, [onInjectFile]);

  // Load persisted auto-execute setting
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY_AUTO, (result) => {
      if (result[STORAGE_KEY_AUTO] === true) setAutoExecute(true);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Tool execution logic
  // ---------------------------------------------------------------------------

  const executeTool = useCallback(async (call: ParsedToolCall) => {
    setEntries((prev) =>
      prev.map((e) => e.call.callId === call.callId ? { ...e, status: "running" } : e)
    );

    const result = await executeToolFromContent(call.toolName, call.args);

    if (!result.ok || result.isError) {
      // result.error covers sendMessage-level failures.
      // result.output covers MCP-level errors (isError:true) — extract text from it.
      const outputMsg =
        typeof result.output === "string"
          ? result.output
          : Array.isArray(result.output)
          ? (result.output as Array<{ text?: string }>)
              .map((c) => c.text ?? JSON.stringify(c))
              .join(" ")
          : result.output != null
          ? JSON.stringify(result.output)
          : undefined;
      const errMsg = result.error ?? outputMsg ?? "Unknown error";
      panelBridge.emit({ type: "tool-error", callId: call.callId, error: errMsg });
      return;
    }

    panelBridge.emit({ type: "tool-result", callId: call.callId, result });

    // The user requested to aggregate results instead of injecting long text immediately.
    // Thus, we remove the auto onInsertTextRef.current(...) injection here.
    // Users will now click "Attach Result File" per tool or "Attach All" to combine them.
  }, []);

  const handleAllow = useCallback((call: ParsedToolCall) => {
    void executeTool(call);
  }, [executeTool]);

  const handleDeny = useCallback((call: ParsedToolCall) => {
    setEntries((prev) =>
      prev.map((e) => e.call.callId === call.callId ? { ...e, status: "denied" } : e)
    );
  }, []);

  const handleAttachFile = useCallback((call: ParsedToolCall, result?: ToolExecutionResult) => {
    if (!result) return;
    const output = formatOutput(result.output);
    const content = [`Tool result for \`${call.toolName}\`:`, "", output].join("\n");
    const filename = `mcp-result-${call.toolName}.md`;
    if (onInjectFileRef.current) {
      void onInjectFileRef.current(content, filename);
    } else {
      onInsertTextRef.current(`\`\`\`\n${content}\n\`\`\``);
    }
  }, []);

  const handleAttachAllFiles = useCallback(() => {
    setEntries((prevEntries) => {
      // Find all done entries that have a result
      const executedEntries = prevEntries.filter((e) => e.status === "done" && e.result);
      if (executedEntries.length === 0) return prevEntries;

      const allContents = executedEntries.map(e => {
          const output = formatOutput(e.result!.output);
          return `## Tool result for \`${e.call.toolName}\`:\n\n\`\`\`\n${output}\n\`\`\``;
      }).reverse().join("\n\n---\n\n"); // reverse to show oldest to newest if they are prepended

      const content = `# MCP Tools Aggregated Results\n\n${allContents}`;
      const filename = `mcp-results-aggregated.md`;

      if (onInjectFileRef.current) {
        void onInjectFileRef.current(content, filename);
      } else {
        onInsertTextRef.current(`\`\`\`\n${content}\n\`\`\``);
      }
      
      // Clear history after attaching
      return prevEntries.filter((e) => e.status === "pending" || e.status === "running");
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Bridge subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return panelBridge.subscribe((event) => {
      if (event.type === "tool-pending") {
        setEntries((prev) => {
          // Guard duplicates
          if (prev.some((e) => e.call.callId === event.call.callId)) return prev;
          return [{ call: event.call, status: "pending", timestamp: Date.now() }, ...prev];
        });
        setCollapsed(false); // auto-expand on new call

        if (autoExecuteRef.current) {
          void executeTool(event.call);
        }
      } else if (event.type === "tool-result") {
        setEntries((prev) =>
          prev.map((e) =>
            e.call.callId === event.callId
              ? { ...e, status: "done", result: event.result }
              : e
          )
        );
      } else if (event.type === "tool-error") {
        setEntries((prev) =>
          prev.map((e) =>
            e.call.callId === event.callId
              ? { ...e, status: "error", error: event.error }
              : e
          )
        );
      }
    });
  }, [executeTool]);

  // ---------------------------------------------------------------------------
  // Auto-execute toggle (persisted)
  // ---------------------------------------------------------------------------

  const toggleAutoExecute = useCallback(() => {
    setAutoExecute((prev) => {
      const next = !prev;
      chrome.storage.local.set({ [STORAGE_KEY_AUTO]: next });
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setEntries((prev) => prev.filter((e) => e.status === "pending" || e.status === "running"));
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const pendingEntries = entries.filter((e) => e.status === "pending");
  const historyEntries = entries.filter((e) => e.status !== "pending" && e.status !== "running");
  const runningEntries = entries.filter((e) => e.status === "running");
  const pendingCount = pendingEntries.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mcp-panel">
      {/* Collapsed badge */}
      {collapsed && (
        <button
          className="mcp-panel__badge"
          title="MCP Tool Calls"
          onClick={() => setCollapsed(false)}
        >
          🔧
          {pendingCount > 0 && (
            <span className="mcp-panel__badge-count">{pendingCount}</span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {!collapsed && (
        <div className="mcp-panel__body">
          {/* Header */}
          <div className="mcp-panel__header">
            <span className="mcp-panel__title">
              <span className="mcp-panel__title-icon">🔧</span>
              MCP Tool Calls
            </span>
            <label className="mcp-panel__auto-label" title="Auto-execute all tool calls without confirmation">
              <input
                type="checkbox"
                checked={autoExecute}
                onChange={toggleAutoExecute}
              />
              Auto
            </label>
            <button
              className="mcp-panel__collapse-btn"
              title="Minimize"
              onClick={() => setCollapsed(true)}
            >
              −
            </button>
          </div>

          {/* Content */}
          <div className="mcp-panel__content">
            {entries.length === 0 ? (
              <div className="mcp-panel__empty">
                <span className="mcp-panel__empty-icon">🔌</span>
                No tool calls yet
              </div>
            ) : (
              <>
                {/* Pending + Running */}
                {(pendingEntries.length > 0 || runningEntries.length > 0) && (
                  <div className="mcp-panel__section">
                    <div className="mcp-panel__section-header">
                      <span className="mcp-panel__section-label">Pending</span>
                    </div>
                    {[...runningEntries, ...pendingEntries].map((entry) => (
                      <ToolCallCard
                        key={entry.call.callId}
                        entry={entry}
                        onAllow={() => handleAllow(entry.call)}
                        onDeny={() => handleDeny(entry.call)}
                        onAttachFile={() => handleAttachFile(entry.call, entry.result)}
                      />
                    ))}
                  </div>
                )}

                {/* History */}
                {historyEntries.length > 0 && (
                  <div className="mcp-panel__section">
                    <div className="mcp-panel__section-header">
                      <span className="mcp-panel__section-label">History</span>
                      <button className="mcp-panel__clear-btn" onClick={clearHistory}>
                        Clear
                      </button>
                    </div>
                    {historyEntries.map((entry) => (
                      <ToolCallCard
                        key={entry.call.callId}
                        entry={entry}
                        onAllow={() => handleAllow(entry.call)}
                        onDeny={() => handleDeny(entry.call)}
                        onAttachFile={() => handleAttachFile(entry.call, entry.result)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer - Attach All Button */}
          {historyEntries.length > 0 && (
            <div className="mcp-panel__footer">
              <button 
                className="mcp-tool-card__btn mcp-tool-card__btn--allow" 
                style={{ width: "100%", padding: "12px", height: "auto" }}
                onClick={handleAttachAllFiles}
                title="Combine all finished results, attach as markdown, and clear history"
              >
                📎 Attach All Results
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
