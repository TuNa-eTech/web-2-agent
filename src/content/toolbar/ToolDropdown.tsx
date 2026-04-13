// ---------------------------------------------------------------------------
// MCP Tool dropdown component
// ---------------------------------------------------------------------------

import React from "react";
import type { ToolbarTool } from "../data";

type Props = {
  tools: ToolbarTool[];
  onSelectTool: (tool: ToolbarTool) => void;
  onClose: () => void;
};

/** Group tools by serverId for display. */
const groupByServer = (tools: ToolbarTool[]): Record<string, ToolbarTool[]> => {
  const groups: Record<string, ToolbarTool[]> = {};
  for (const t of tools) {
    (groups[t.serverId] ??= []).push(t);
  }
  return groups;
};

const riskClass = (risk: string) => {
  switch (risk) {
    case "read":
      return "risk-badge risk-badge--read";
    case "write":
      return "risk-badge risk-badge--write";
    default:
      return "risk-badge risk-badge--unknown";
  }
};

export const ToolDropdown: React.FC<Props> = ({ tools, onSelectTool, onClose }) => {
  const groups = groupByServer(tools);
  const serverIds = Object.keys(groups);

  return (
    <>
      <div className="dropdown-overlay" onClick={onClose} />
      <div className="dropdown">
        <div className="dropdown-header">MCP Tools</div>
        {tools.length === 0 ? (
          <div className="dropdown-empty">
            No tools available.<br />
            Connect an MCP server first.
          </div>
        ) : (
          serverIds.map((serverId) => (
            <div key={serverId}>
              <div className="dropdown-group-label">📦 {serverId}</div>
              {groups[serverId].map((tool) => (
                <button
                  key={tool.namespacedName}
                  className="dropdown-item"
                  onClick={() => {
                    onSelectTool(tool);
                    onClose();
                  }}
                >
                  <span className="item-icon">🔧</span>
                  <div className="item-info">
                    <div className="item-name">{tool.originalName}</div>
                    {tool.description && (
                      <div className="item-desc">{tool.description}</div>
                    )}
                  </div>
                  <span className={riskClass(tool.risk)}>{tool.risk}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
};
