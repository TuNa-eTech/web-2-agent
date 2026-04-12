import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import "../styles/globals.css";

document.body.dataset.surface = "sidepanel";

const container = document.getElementById("app");

if (!container) {
  throw new Error("Side panel root element not found.");
}

const Placeholder = () =>
  createElement(
    "div",
    { className: "flex h-screen items-center justify-center text-muted-foreground text-sm" },
    "Side panel — coming soon",
  );

createRoot(container).render(
  createElement(StrictMode, null, createElement(Placeholder)),
);
