import { PopupServerStatus } from "../pages/types";
import { el } from "./dom";

const STATUS_LABELS: Record<PopupServerStatus["status"], string> = {
  draft: "Draft",
  connecting: "Connecting",
  connected: "Connected",
  degraded: "Degraded",
  failed: "Failed",
  disabled: "Disabled",
};

export const renderStatusPanel = (server: PopupServerStatus): HTMLElement => {
  const statusRow = el("div", { className: "status-row" }, [
    el("span", { className: "status-dot status-" + server.status }),
    el("span", { className: "status-label", text: STATUS_LABELS[server.status] }),
  ]);

  const meta = el("div", { className: "status-meta" }, [
    el("span", { text: `${server.toolCount} tools` }),
    server.lastCheckedAt
      ? el("span", { text: `Checked ${server.lastCheckedAt}` })
      : el("span", { text: "Not checked yet" }),
  ]);

  const error =
    server.errorCategory || server.errorMessage
      ? el("div", { className: "status-error" }, [
          el("span", {
            text: server.errorCategory
              ? `Error: ${server.errorCategory}`
              : "Error",
          }),
          server.errorMessage ? el("div", { text: server.errorMessage }) : null,
        ])
      : null;

  return el("section", { className: "card" }, [
    el("div", { className: "card-title", text: server.name }),
    statusRow,
    meta,
    error,
  ]);
};
