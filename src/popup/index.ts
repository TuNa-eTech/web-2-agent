import {
  loadConnectionHealthMap,
  loadServerIndex,
  loadToolCatalog,
} from "../core/storage/configStorage";
import { buildPopupState, renderPopup } from "./pages/popup";

const root = document.getElementById("app") ?? document.body;

const wirePopupShortcuts = (container: HTMLElement) => {
  container
    .querySelector<HTMLButtonElement>("#open-options")
    ?.addEventListener("click", () => {
      chrome.runtime?.sendMessage?.({ type: "popup:open-options" });
    });

  container
    .querySelector<HTMLButtonElement>("#open-sidepanel")
    ?.addEventListener("click", () => {
      chrome.runtime?.sendMessage?.({ type: "popup:open-sidepanel" });
    });

  container
    .querySelectorAll<HTMLButtonElement>(".quick-action")
    .forEach((button) => {
      button.addEventListener("click", () => {
        chrome.runtime?.sendMessage?.({
          type: "popup:open-sidepanel",
          serverId: button.dataset.serverId,
          actionId: button.dataset.actionId,
        });
      });
    });
};

const bootstrapPopup = async () => {
  const [serverIndex, healthMap, toolCatalog] = await Promise.all([
    loadServerIndex(),
    loadConnectionHealthMap(),
    loadToolCatalog(),
  ]);

  renderPopup(buildPopupState(serverIndex, healthMap, toolCatalog), root);
  wirePopupShortcuts(root);
  chrome.runtime?.sendMessage?.({ type: "popup:ping" });
};

void bootstrapPopup();
