type SidepanelPortMessage =
  | { type: "sidepanel:ping" }
  | { type: "sidepanel:ready" }
  | { type: "sidepanel:stream"; payload: unknown };

export const registerPortRouter = () => {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "sidepanel") {
      port.disconnect();
      return;
    }

    port.onMessage.addListener((message: unknown) => {
      if (!message || typeof message !== "object" || !("type" in message)) {
        return;
      }

      const payload = message as SidepanelPortMessage;

      if (payload.type === "sidepanel:ping") {
        port.postMessage({ type: "sidepanel:ready" } satisfies SidepanelPortMessage);
      }
    });

    port.onDisconnect.addListener(() => {
      // TODO: cleanup long-lived sessions.
    });

    port.postMessage({ type: "sidepanel:ready" } satisfies SidepanelPortMessage);
  });
};
