import { createConnectionManager } from "./runtime";
import { registerOneShotRouter } from "./messages";
import { registerPortRouter } from "./ports";

export const startBackground = () => {
  const connectionManager = createConnectionManager();

  registerOneShotRouter({ connectionManager });
  registerPortRouter();

  chrome.runtime.onInstalled.addListener(() => {
    // TODO: seed storage or telemetry bootstraps.
  });

  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }
};
