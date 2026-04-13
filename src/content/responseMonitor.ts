// ---------------------------------------------------------------------------
// Response Monitor — watches AI responses for tool call blocks and
// replaces them with interactive execution cards.
//
// Flow:
//   AI outputs <function_calls> XML  →  monitor detects it  →  renders card
//   →  auto-execute / user clicks Run  →  result injected  →  AI continues
// ---------------------------------------------------------------------------

import type { ToolExecutionResult } from "./data";
import { executeToolFromContent } from "./data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OBSERVER_DEBOUNCE_MS = 400;
const MONITOR_ATTR = "data-mcp-monitored";
const CARD_ATTR = "data-mcp-card";
const CARD_CLASS = "mcp-tool-card";

/**
 * Regex to detect <function_calls> blocks.
 * Captures invoke name, optional call_id, and all parameter tags.
 */
const FUNCTION_CALLS_RE =
  /<function_calls>\s*<invoke\s+name="([^"]+)"(?:\s+call_id="([^"]+)")?>\s*([\s\S]*?)<\/invoke>\s*<\/function_calls>/g;

/** Extract param name→value from parameter tags. */
const PARAMETER_RE =
  /<parameter\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/parameter>/g;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

interface ParsedToolCall {
  toolName: string;
  callId: string;
  args: Record<string, unknown>;
  rawXml: string;
}

function parseToolCalls(text: string): ParsedToolCall[] {
  const results: ParsedToolCall[] = [];
  FUNCTION_CALLS_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = FUNCTION_CALLS_RE.exec(text)) !== null) {
    const toolName = m[1];
    const callId = m[2] || `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const paramsBlock = m[3];

    const args: Record<string, unknown> = {};
    PARAMETER_RE.lastIndex = 0;
    let pm: RegExpExecArray | null;
    while ((pm = PARAMETER_RE.exec(paramsBlock)) !== null) {
      const val = pm[2].trim();
      // Try to parse as JSON value (number, bool, object)
      try {
        args[pm[1]] = JSON.parse(val);
      } catch {
        args[pm[1]] = val;
      }
    }

    results.push({ toolName, callId, args, rawXml: m[0] });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Card Rendering (pure DOM — injected into host page, NOT Shadow DOM)
// ---------------------------------------------------------------------------

function createToolCard(
  call: ParsedToolCall,
  onInsertText: (text: string) => void,
): HTMLElement {
  const card = document.createElement("div");
  card.className = CARD_CLASS;
  card.setAttribute(CARD_ATTR, call.callId);

  // -- Header --
  const header = document.createElement("div");
  header.className = `${CARD_CLASS}__header`;
  header.innerHTML = `
    <span class="${CARD_CLASS}__icon">🔧</span>
    <span class="${CARD_CLASS}__name">${escapeHtml(call.toolName)}</span>
  `;

  // -- Params --
  const params = document.createElement("div");
  params.className = `${CARD_CLASS}__params`;
  for (const [k, v] of Object.entries(call.args)) {
    const line = document.createElement("div");
    line.className = `${CARD_CLASS}__param`;
    const valStr = typeof v === "string" ? v : JSON.stringify(v);
    line.innerHTML = `<span class="${CARD_CLASS}__param-key">${escapeHtml(k)}:</span> <span class="${CARD_CLASS}__param-value">${escapeHtml(valStr)}</span>`;
    params.appendChild(line);
  }

  // -- Actions --
  const actions = document.createElement("div");
  actions.className = `${CARD_CLASS}__actions`;

  const runBtn = document.createElement("button");
  runBtn.className = `${CARD_CLASS}__run-btn`;
  runBtn.textContent = "▶ Run";
  runBtn.addEventListener("click", () => void executeCard(card, call, runBtn, resultArea, onInsertText));

  actions.appendChild(runBtn);

  // -- Result area --
  const resultArea = document.createElement("div");
  resultArea.className = `${CARD_CLASS}__result`;
  resultArea.style.display = "none";

  card.appendChild(header);
  card.appendChild(params);
  card.appendChild(actions);
  card.appendChild(resultArea);

  // Inject minimal inline styles so the card looks acceptable
  // even without access to the Shadow DOM stylesheet.
  injectCardStyles();

  return card;
}

// ---------------------------------------------------------------------------
// Card Execution
// ---------------------------------------------------------------------------

async function executeCard(
  card: HTMLElement,
  call: ParsedToolCall,
  runBtn: HTMLButtonElement,
  resultArea: HTMLElement,
  onInsertText: (text: string) => void,
): Promise<void> {
  // Disable button + show loading
  runBtn.disabled = true;
  runBtn.textContent = "⏳ Running…";
  resultArea.style.display = "block";
  resultArea.textContent = "Executing…";
  resultArea.className = `${CARD_CLASS}__result ${CARD_CLASS}__result--loading`;

  const result: ToolExecutionResult = await executeToolFromContent(call.toolName, call.args);

  if (!result.ok || result.isError) {
    runBtn.textContent = "❌ Failed";
    resultArea.textContent = result.error ?? "Unknown error";
    resultArea.className = `${CARD_CLASS}__result ${CARD_CLASS}__result--error`;
    // Allow retry
    setTimeout(() => {
      runBtn.disabled = false;
      runBtn.textContent = "▶ Retry";
    }, 2000);
    return;
  }

  // Success
  runBtn.textContent = "✅ Done";
  const output = formatOutput(result.output);
  resultArea.textContent = output;
  resultArea.className = `${CARD_CLASS}__result ${CARD_CLASS}__result--success`;

  // Insert result into chat so the AI can continue
  const insertText = [
    `Tool result for \`${call.toolName}\`:`,
    "```",
    output,
    "```",
  ].join("\n");
  onInsertText(insertText);
}

// ---------------------------------------------------------------------------
// Observer
// ---------------------------------------------------------------------------

/**
 * Platform-specific selectors for the AI response area.
 * Returns all candidate containers where AI output appears.
 */
function getResponseContainers(platform: string): HTMLElement[] {
  const selectors: Record<string, string[]> = {
    gemini: [
      ".model-response-text",
      ".response-content",
      "message-content",
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
 * Scan a single container for tool call blocks, replace them with cards.
 */
function processContainer(
  container: HTMLElement,
  onInsertText: (text: string) => void,
): void {
  // Look for code blocks or text nodes containing <function_calls>
  const codeBlocks = container.querySelectorAll<HTMLElement>("pre, code");

  for (const block of codeBlocks) {
    if (block.hasAttribute(MONITOR_ATTR)) continue;

    const text = block.textContent ?? "";
    const calls = parseToolCalls(text);
    if (calls.length === 0) continue;

    // Mark as processed
    block.setAttribute(MONITOR_ATTR, "true");

    // Replace the code block with tool cards
    for (const call of calls) {
      const card = createToolCard(call, onInsertText);
      block.parentElement?.insertBefore(card, block);
    }

    // Hide the original XML block
    block.style.display = "none";
  }

  // Also check direct text content (some platforms render inline)
  const text = container.textContent ?? "";
  if (text.includes("<function_calls>") && !container.hasAttribute(MONITOR_ATTR)) {
    const calls = parseToolCalls(text);
    if (calls.length > 0) {
      container.setAttribute(MONITOR_ATTR, "true");
      for (const call of calls) {
        const card = createToolCard(call, onInsertText);
        container.appendChild(card);
      }
    }
  }
}

/**
 * Start monitoring AI responses for tool call blocks.
 * Returns a cleanup function.
 */
export function startResponseMonitor(
  platform: string,
  onInsertText: (text: string) => void,
): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scan = () => {
    const containers = getResponseContainers(platform);
    for (const c of containers) {
      processContainer(c, onInsertText);
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

  // Cleanup
  return () => {
    observer.disconnect();
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
// Card Styles — injected once into the host page <head>
// ---------------------------------------------------------------------------

let stylesInjected = false;

function injectCardStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const css = `
.${CARD_CLASS} {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 8px 0;
  padding: 12px;
  background: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
}
.${CARD_CLASS}__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  margin-bottom: 8px;
}
.${CARD_CLASS}__icon { font-size: 16px; }
.${CARD_CLASS}__name { color: #1a73e8; }
.${CARD_CLASS}__params {
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  font-size: 12px;
}
.${CARD_CLASS}__param { margin-bottom: 2px; }
.${CARD_CLASS}__param-key { color: #5f6368; font-weight: 500; }
.${CARD_CLASS}__param-value { color: #202124; }
.${CARD_CLASS}__actions { margin-bottom: 4px; }
.${CARD_CLASS}__run-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border: 1px solid #1a73e8;
  background: #1a73e8;
  color: #fff;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.${CARD_CLASS}__run-btn:hover { background: #1558b0; }
.${CARD_CLASS}__run-btn:disabled {
  opacity: 0.7;
  cursor: default;
}
.${CARD_CLASS}__result {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}
.${CARD_CLASS}__result--loading {
  background: #e8f0fe;
  color: #174ea6;
}
.${CARD_CLASS}__result--success {
  background: #e6f4ea;
  color: #137333;
}
.${CARD_CLASS}__result--error {
  background: #fce8e6;
  color: #c5221f;
}
`;

  const style = document.createElement("style");
  style.setAttribute("data-mcp-card-styles", "true");
  style.textContent = css;
  document.head.appendChild(style);
}
