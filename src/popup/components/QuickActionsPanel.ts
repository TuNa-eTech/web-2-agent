import {
  deriveAtlassianCapabilities,
} from "../../presets/atlassian/capability-map";
import {
  deriveAtlassianQuickActions,
} from "../../presets/atlassian/quick-actions";
import { ATLASSIAN_CAPABILITY_LABELS } from "../../presets/atlassian/ui/labels";
import { PopupServerStatus } from "../pages/types";
import { el } from "./dom";

export const renderQuickActionsPanel = (
  server: PopupServerStatus,
): HTMLElement => {
  const { detected } = deriveAtlassianCapabilities(server.tools);
  const quickActions = deriveAtlassianQuickActions(server.tools)
    .filter((entry) => entry.available)
    .map((entry) => entry.action);

  const actionList =
    quickActions.length > 0
      ? el(
          "div",
          { className: "quick-actions" },
          quickActions.map((action) =>
            el(
              "button",
              {
                className: "quick-action",
                attrs: {
                  type: "button",
                  "data-server-id": server.serverId,
                  "data-action-id": action.id,
                },
              },
              [
              el("div", { className: "quick-title", text: action.title }),
              el("div", {
                className: "quick-description",
                text: action.description,
              }),
              ],
            ),
          ),
        )
      : el("div", {
          className: "empty-state",
          text: "No quick actions available for this server.",
        });

  const capabilityBadges = Array.from(detected)
    .map((capability) => ATLASSIAN_CAPABILITY_LABELS[capability]?.label)
    .filter(Boolean)
    .map((label) => el("span", { className: "badge", text: label as string }));

  const capabilityRow =
    capabilityBadges.length > 0
      ? el("div", { className: "badge-row" }, capabilityBadges)
      : el("div", {
          className: "empty-state",
          text: "No Atlassian capabilities detected yet.",
        });

  return el("section", { className: "card" }, [
    el("div", { className: "card-title", text: "Quick actions" }),
    capabilityRow,
    actionList,
  ]);
};
