import type { ConnectionManager } from "./runtime/connection-manager";

type OneShotMessage =
  | { type: "popup:ping" }
  | { type: "options:ping" }
  | { type: "popup:open-options" }
  | { type: "popup:open-sidepanel"; serverId?: string; actionId?: string }
  | { type: "options:test-connections" };

export const registerOneShotRouter = (services: {
  connectionManager: ConnectionManager;
}) => {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return false;
    }

    const payload = message as OneShotMessage;

    switch (payload.type) {
      case "popup:ping":
      case "options:ping":
        sendResponse({ ok: true });
        return false;
      case "popup:open-options":
        chrome.runtime.openOptionsPage();
        sendResponse({ ok: true });
        return false;
      case "popup:open-sidepanel":
        chrome.windows.getCurrent((currentWindow) => {
          const windowId = currentWindow.id;

          if (windowId === undefined) {
            sendResponse({ ok: false, error: "missing_window_id" });
            return;
          }

          chrome.sidePanel.open({ windowId }, () => {
            const error = chrome.runtime.lastError;
            if (error) {
              sendResponse({ ok: false, error: error.message });
              return;
            }
            sendResponse({ ok: true });
          });
        });
        return true;
      case "options:test-connections":
        void services.connectionManager
          .testAllConnections()
          .then((summary) => {
            sendResponse({ ok: true, summary });
          })
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : "Failed to test configured MCP servers.";
            sendResponse({ ok: false, error: message });
          });
        return true;
      default:
        sendResponse({ ok: false, error: "unhandled_message" });
        return false;
    }
  });
};
