import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import { ChatPage } from "./pages/ChatPage";

const container = document.getElementById("app");

if (!container) {
  throw new Error("Side panel root element not found.");
}

createRoot(container).render(
  createElement(StrictMode, null, createElement(ChatPage)),
);

const port = chrome.runtime.connect({ name: "sidepanel" });
port.postMessage({ type: "sidepanel:ping" });
