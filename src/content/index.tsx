// ---------------------------------------------------------------------------
// Content script entry point
// Detects platform, injects toolbar into AI chat input area via Shadow DOM,
// mounts the floating MCP panel, and starts monitoring AI responses.
// ---------------------------------------------------------------------------

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { detectPlatform, createAdapter } from "./adapters";
import { getOrCreateShadowHost, removeShadowHost, injectCSS } from "./shadow";
import { createNavigationWatcher } from "./navigation";
import { startResponseMonitor } from "./responseMonitor";
import { Toolbar } from "./toolbar/Toolbar";
import { McpPanel } from "./mcpPanel/McpPanel";
import toolbarCSS from "./toolbar/toolbar.css?inline";
import panelCSS from "./mcpPanel/McpPanel.css?inline";

const SHADOW_HOST_ID = "mcp-toolbar-shadow-host";
const PANEL_HOST_ID = "mcp-panel-shadow-host";
const LOG_PREFIX = "[MCP-Toolbar]";

let cleanupNavWatcher: (() => void) | null = null;
let cleanupResponseMonitor: (() => void) | null = null;
let currentRoot: Root | null = null;

// ---------------------------------------------------------------------------
// Floating panel — mounted once, persists across SPA navigations
// ---------------------------------------------------------------------------

let panelMounted = false;

const mountPanel = (
  onInsertText: (text: string) => void,
  onInjectFile: (content: string, filename: string) => Promise<"file" | "text">
): void => {
  if (panelMounted && document.getElementById(PANEL_HOST_ID)) return;
  panelMounted = false;

  // Remove stale host if it somehow exists without a shadow root
  document.getElementById(PANEL_HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = PANEL_HOST_ID;
  // pointer-events:none so the fixed overlay doesn't block page clicks
  host.style.cssText =
    "position:fixed;bottom:0;right:0;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  void injectCSS(shadow, panelCSS).then(() => {
    const container = document.createElement("div");
    shadow.appendChild(container);
    createRoot(container).render(
      React.createElement(McpPanel, { onInsertText, onInjectFile }),
    );
    panelMounted = true;
  });
};

// ---------------------------------------------------------------------------
// Toolbar — torn down and re-mounted on SPA navigation
// ---------------------------------------------------------------------------

/** Tear down existing toolbar so a fresh one can be injected. */
const cleanup = (): void => {
  cleanupResponseMonitor?.();
  cleanupResponseMonitor = null;

  if (currentRoot) {
    currentRoot.unmount();
    currentRoot = null;
  }

  removeShadowHost(); // only removes toolbar host, not panel host
};

/** Main injection routine. Can be called multiple times (SPA re-inject). */
const inject = async (): Promise<void> => {
  // 1. Detect platform
  const platform = detectPlatform();
  if (!platform) return;

  console.log(`${LOG_PREFIX} Detected platform: ${platform}`);

  // 2. Create adapter and wait for DOM readiness
  const adapter = createAdapter(platform);

  try {
    await adapter.waitForReady();
  } catch (err) {
    console.warn(`${LOG_PREFIX} Page not ready:`, err);
    return;
  }

  // 3. Find insertion point
  const insertionPoint = adapter.findInsertionPoint();
  if (!insertionPoint) {
    console.warn(`${LOG_PREFIX} No insertion point found`);
    return;
  }

  // 4. Check if shadow host already exists AND is correctly placed
  const { host: existingHost, isNew: wouldBeNew } = getOrCreateShadowHost();
  if (!wouldBeNew && insertionPoint.contains(existingHost)) {
    // Host is already in the right place — nothing to do for toolbar
    return;
  }

  // 5. Clean up stale toolbar host
  cleanup();

  // 6. Create fresh Shadow DOM host for toolbar
  const { host, shadow } = getOrCreateShadowHost();

  // Apply host styles — toolbar sits as the first row inside the composer form.
  // align-self: flex-start prevents it from stretching in a flex-column form.
  Object.assign(host.style, {
    display: "flex",
    alignItems: "center",
    alignSelf: "flex-start",
    width: "100%",
    padding: "4px 8px 2px",
    margin: "0",
    boxSizing: "border-box",
    flexShrink: "0",
  });

  // 7. Inject CSS into shadow root
  await injectCSS(shadow, toolbarCSS);

  // 8. Create React container inside shadow
  const container = document.createElement("div");
  container.id = "toolbar-root";
  shadow.appendChild(container);

  // 9. Prepend toolbar as the FIRST ROW inside the composer container.
  //    This keeps the host inside the same centered/width-constrained parent
  //    as the textarea and buttons, so it aligns correctly on all platforms.
  insertionPoint.prepend(host);

  console.log(`${LOG_PREFIX} Shadow host injected into ${platform} page`);

  // 10. Callbacks shared between toolbar and panel
  const onInsertText = (text: string) => adapter.insertText(text);
  const onInjectContext = async (content: string): Promise<"file" | "text"> => {
    const ok = await adapter.injectFile?.(content, "mcp-context.md");
    if (ok) return "file";
    adapter.insertText(content);
    return "text";
  };

  // 11. Render React toolbar
  currentRoot = createRoot(container);
  currentRoot.render(
    React.createElement(Toolbar, {
      platform,
      onInsertText,
      onInjectContext,
    }),
  );

  console.log(`${LOG_PREFIX} Toolbar rendered`);

  const onInjectFileResult = async (content: string, filename: string): Promise<"file" | "text"> => {
    const ok = await adapter.injectFile?.(content, filename);
    if (ok) return "file";
    adapter.insertText(content);
    return "text";
  };

  // 12. Mount floating panel (idempotent — only runs once per page load)
  mountPanel(onInsertText, onInjectFileResult);

  // 13. Start monitoring AI responses
  cleanupResponseMonitor?.();
  cleanupResponseMonitor = startResponseMonitor(platform, onInsertText);

  console.log(`${LOG_PREFIX} Response monitor started`);
};

/** Bootstrap: inject + set up navigation watcher */
const bootstrap = (): void => {
  cleanupNavWatcher?.();

  void inject();

  cleanupNavWatcher = createNavigationWatcher(SHADOW_HOST_ID, () => {
    console.log(`${LOG_PREFIX} Re-injecting toolbar after navigation`);
    void inject();
  });
};

// Start!
bootstrap();
