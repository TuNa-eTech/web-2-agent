import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../styles/globals.css";

document.body.dataset.surface = "options";

const container = document.getElementById("app");

if (!container) {
  throw new Error("Options root element not found.");
}

createRoot(container).render(
  createElement(StrictMode, null, createElement(App)),
);

chrome.runtime.sendMessage({ type: "options:ping" });
