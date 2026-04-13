// ---------------------------------------------------------------------------
// Content script entry point
// Detects platform, injects toolbar into AI chat input area via Shadow DOM
// and starts monitoring AI responses for tool call blocks.
// ---------------------------------------------------------------------------

import React from "react";
import { createRoot } from "react-dom/client";
import { detectPlatform, createAdapter } from "./adapters";
import { getOrCreateShadowHost, injectCSS } from "./shadow";
import { createNavigationWatcher } from "./navigation";
import { startResponseMonitor } from "./responseMonitor";
import { Toolbar } from "./toolbar/Toolbar";
import toolbarCSS from "./toolbar/toolbar.css?inline";

const SHADOW_HOST_ID = "mcp-toolbar-shadow-host";
const LOG_PREFIX = "[MCP-Toolbar]";

let cleanupNavWatcher: (() => void) | null = null;
let cleanupResponseMonitor: (() => void) | null = null;

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

  // 4. Create or reuse Shadow DOM host
  const { host, shadow, isNew } = getOrCreateShadowHost();

  if (!isNew) {
    console.log(`${LOG_PREFIX} Shadow host already exists, skipping`);
    return;
  }

  // 5. Inject CSS into shadow root
  await injectCSS(shadow, toolbarCSS);

  // 6. Create React container inside shadow
  const container = document.createElement("div");
  container.id = "toolbar-root";
  shadow.appendChild(container);

  // 7. Insert into the page DOM
  insertionPoint.prepend(host);

  console.log(`${LOG_PREFIX} Shadow host injected into ${platform} page`);

  // 8. Render React toolbar
  const root = createRoot(container);
  root.render(
    React.createElement(Toolbar, {
      platform,
      onInsertText: (text: string) => adapter.insertText(text),
    }),
  );

  console.log(`${LOG_PREFIX} Toolbar rendered`);

  // 9. Start monitoring AI responses for tool call blocks
  cleanupResponseMonitor?.();
  cleanupResponseMonitor = startResponseMonitor(platform, (text: string) =>
    adapter.insertText(text),
  );

  console.log(`${LOG_PREFIX} Response monitor started`);
};

/** Bootstrap: inject + set up navigation watcher */
const bootstrap = (): void => {
  // Clean up previous watcher if any (defensive)
  cleanupNavWatcher?.();

  // Run initial injection
  void inject();

  // Set up navigation watcher for SPA re-injection
  cleanupNavWatcher = createNavigationWatcher(SHADOW_HOST_ID, () => {
    console.log(`${LOG_PREFIX} Re-injecting toolbar after navigation`);
    void inject();
  });
};

// Start!
bootstrap();

