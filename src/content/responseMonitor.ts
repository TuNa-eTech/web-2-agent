// ---------------------------------------------------------------------------
// Response Monitor — watches AI responses for tool call blocks and
// routes them to the floating MCP panel via panelBridge.
//
// Flow:
//   AI outputs <function_calls> XML  →  monitor detects it
//   →  panelBridge.emit('tool-pending')  →  McpPanel handles UI + execution
// ---------------------------------------------------------------------------

import { panelBridge } from "./mcpPanel/panelBridge";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OBSERVER_DEBOUNCE_MS = 400;
const MONITOR_ATTR = "data-mcp-monitored";

/**
 * Regex to detect <function_calls> blocks.
 * Captures invoke name, optional call_id, and all parameter tags.
 */
const FUNCTION_CALLS_RE =
  /<function_calls>\s*<invoke\s+name="([^"]+)"(?:\s+call_id="([^"]+)")?\s*>\s*([\s\S]*?)<\/invoke>\s*<\/function_calls>/g;

/** Extract param name→value from parameter tags. */
const PARAMETER_RE =
  /<parameter\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/parameter>/g;

// ---------------------------------------------------------------------------
// Deduplication — primary guard against duplicates across multiple scans
// ---------------------------------------------------------------------------

/**
 * Set of all callIds already emitted this page session.
 * Module-level so it persists across multiple scan() invocations.
 */
const emittedCallIds = new Set<string>();

/** Clear the emitted set — call this when the monitor is torn down. */
export function resetResponseMonitor(): void {
  emittedCallIds.clear();
}

// ---------------------------------------------------------------------------
// Stable ID derivation
// ---------------------------------------------------------------------------

/**
 * Derive a stable, deterministic call ID from raw XML text.
 * Using a djb2-style hash ensures the same tool call always maps to
 * the same ID regardless of how many times the DOM scanner fires.
 * This prevents the "duplicate card" bug that occurred when Date.now()
 * was used as the ID fallback.
 */
function stableCallId(rawXml: string): string {
  let hash = 5381;
  for (let i = 0; i < rawXml.length; i++) {
    hash = (hash * 33) ^ rawXml.charCodeAt(i);
  }
  return "call-" + (hash >>> 0).toString(16);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseToolCalls(text: string) {
  const results: Array<{
    toolName: string;
    callId: string;
    args: Record<string, unknown>;
    rawXml: string;
  }> = [];
  FUNCTION_CALLS_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = FUNCTION_CALLS_RE.exec(text)) !== null) {
    const toolName = m[1];
    const rawXml = m[0];
    // Use explicit call_id if provided; otherwise derive a stable one from raw XML.
    const callId = m[2] || stableCallId(rawXml);
    const paramsBlock = m[3];

    const args: Record<string, unknown> = {};
    PARAMETER_RE.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = PARAMETER_RE.exec(paramsBlock)) !== null) {
      let val = pm[2].trim();

      // Decode XML entities (Gemini often escapes &, <, etc. in its XML output)
      val = val.replace(/&(amp|lt|gt|quot|apos|#39);/g, (match, entity) => {
        switch (entity) {
          case "amp": return "&";
          case "lt":  return "<";
          case "gt":  return ">";
          case "quot": return '"';
          case "apos": return "'";
          case "#39":  return "'";
          default: return match;
        }
      });

      try {
        args[pm[1]] = JSON.parse(val);
      } catch {
        args[pm[1]] = val;
      }
    }

    results.push({ toolName, callId, args, rawXml });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Container processing
// ---------------------------------------------------------------------------

/**
 * Platform-specific selectors for the AI response area.
 */
function getResponseContainers(platform: string): HTMLElement[] {
  const selectors: Record<string, string[]> = {
    gemini: [
      ".model-response-text",
      ".response-content",
      "message-content",
      ".message-content",
      ".markdown",
    ],
    chatgpt: [
      "[data-message-author-role='assistant']",
      ".markdown",
      ".result-streaming",
    ],
  };

  const sels = selectors[platform] ?? selectors.gemini;
  const elements: HTMLElement[] = [];
  for (const sel of sels) {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => elements.push(el));
  }
  return elements;
}

/**
 * Emit a parsed tool call only if it hasn't been emitted yet this session.
 * Uses the stable callId as the deduplication key.
 * Returns true if a new emission occurred.
 */
function emitIfNew(call: {
  toolName: string;
  callId: string;
  args: Record<string, unknown>;
  rawXml: string;
}): boolean {
  if (emittedCallIds.has(call.callId)) return false;
  emittedCallIds.add(call.callId);
  panelBridge.emit({ type: "tool-pending", call });
  return true;
}

/**
 * Scan a container for tool call blocks and emit new ones to the panel bridge.
 * Hides the raw XML so it doesn't clutter the chat UI.
 *
 * Key invariant: if a child <pre>/<code> block has already handled a tool call,
 * we skip scanning the ancestor container text to avoid double-emission.
 */
function processContainer(container: HTMLElement): void {
  let childHandledCalls = false;

  // --- Pass 1: scan <pre> and <code> children ---
  const codeBlocks = container.querySelectorAll<HTMLElement>("pre, code");
  for (const block of codeBlocks) {
    const text = block.textContent ?? "";
    if (!text.includes("<function_calls>")) continue;

    const calls = parseToolCalls(text);
    if (calls.length === 0) continue;

    // Mark the DOM node to skip it on future MutationObserver scans
    if (!block.hasAttribute(MONITOR_ATTR)) {
      block.setAttribute(MONITOR_ATTR, "true");
      block.style.display = "none"; // hide raw XML from chat UI
    }

    for (const call of calls) {
      if (emitIfNew(call)) childHandledCalls = true;
    }
  }

  // --- Pass 2: scan container text directly (e.g. inline rendering) ---
  // Only if no child block already handled tool calls; prevents double-fire.
  if (!childHandledCalls) {
    const text = container.textContent ?? "";
    if (text.includes("<function_calls>") && !container.hasAttribute(MONITOR_ATTR)) {
      const calls = parseToolCalls(text);
      if (calls.length > 0) {
        container.setAttribute(MONITOR_ATTR, "true");
        for (const call of calls) {
          emitIfNew(call);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start monitoring AI responses for tool call blocks.
 * Returns a cleanup function.
 *
 * Note: onInsertText is kept in the signature for backwards compatibility
 * but tool result injection is now handled by McpPanel directly.
 */
export function startResponseMonitor(
  platform: string,
  _onInsertText: (text: string) => void,
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scan = () => {
    const containers = getResponseContainers(platform);
    for (const c of containers) {
      processContainer(c);
    }
  };

  // Initial scan
  scan();

  // Observe the document body for new response elements
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scan, OBSERVER_DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  return () => {
    observer.disconnect();
    if (debounceTimer) clearTimeout(debounceTimer);
    resetResponseMonitor();
  };
}
