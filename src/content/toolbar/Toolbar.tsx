// ---------------------------------------------------------------------------
// Main Toolbar component — rendered inside Shadow DOM
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback } from "react";
import type { Platform } from "../adapters/types";
import type { ToolbarData, ToolbarTool } from "../data";
import {
  loadToolbarData,
  subscribeToolbarData,
  toggleSkillFromContent,
  buildContextPrompt,
} from "../data";
import { ToolDropdown } from "./ToolDropdown";
import { SkillDropdown } from "./SkillDropdown";

type Props = {
  platform: Platform;
  onInsertText: (text: string) => void;
};

export const Toolbar: React.FC<Props> = ({ platform, onInsertText }) => {
  const [data, setData] = useState<ToolbarData>({ tools: [], skills: [] });
  const [activeDropdown, setActiveDropdown] = useState<"tools" | "skills" | null>(null);
  const [contextInjected, setContextInjected] = useState(false);

  // Load initial data + subscribe to changes
  useEffect(() => {
    void loadToolbarData().then(setData);
    const unsub = subscribeToolbarData(setData);
    return unsub;
  }, []);

  const handleSelectTool = useCallback(
    (tool: ToolbarTool) => {
      // Insert a prompt asking the AI to use this specific tool.
      // The AI will output a <function_calls> block which the
      // response monitor will detect and render as a run card.
      const prompt = `Use the tool "${tool.namespacedName}" — ${tool.description}`;
      onInsertText(prompt);
      setActiveDropdown(null);
    },
    [onInsertText],
  );

  const handleToggleSkill = useCallback((skillId: string, enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === skillId ? { ...s, enabled } : s)),
    }));
    toggleSkillFromContent(skillId, enabled);
  }, []);

  const handleInjectContext = useCallback(async () => {
    const prompt = await buildContextPrompt(data);
    onInsertText(prompt);
    setContextInjected(true);
    setTimeout(() => setContextInjected(false), 3000);
  }, [data, onInsertText]);

  const closeDropdown = useCallback(() => setActiveDropdown(null), []);

  const toolCount = data.tools.length;
  const activeSkillCount = data.skills.filter((s) => s.enabled).length;
  const hasAnything = toolCount > 0 || data.skills.length > 0;

  return (
    <div className={`toolbar toolbar--${platform}`}>
      {/* Inject Context */}
      {hasAnything && (
        <button
          className={`toolbar-btn ${contextInjected ? "toolbar-btn--done" : "toolbar-btn--primary"}`}
          onClick={handleInjectContext}
          title="Insert tool & skill descriptions into the chat"
          disabled={contextInjected}
        >
          <span className="icon">{contextInjected ? "✅" : "📋"}</span>
          <span>{contextInjected ? "Injected" : "Inject Context"}</span>
        </button>
      )}

      {/* MCP Tools button */}
      <button
        className="toolbar-btn"
        onClick={() => setActiveDropdown(activeDropdown === "tools" ? null : "tools")}
        title="MCP Tools"
      >
        <span className="icon">🔧</span>
        <span>MCP</span>
        {toolCount > 0 && <span className="badge badge--tools">{toolCount}</span>}
      </button>

      {/* Skills button */}
      <button
        className="toolbar-btn"
        onClick={() => setActiveDropdown(activeDropdown === "skills" ? null : "skills")}
        title="Skills"
      >
        <span className="icon">📝</span>
        <span>Skills</span>
        {activeSkillCount > 0 && (
          <span className="badge badge--skills">{activeSkillCount}</span>
        )}
      </button>

      {/* Dropdowns */}
      {activeDropdown === "tools" && (
        <ToolDropdown
          tools={data.tools}
          onSelectTool={handleSelectTool}
          onClose={closeDropdown}
        />
      )}
      {activeDropdown === "skills" && (
        <SkillDropdown
          skills={data.skills}
          onToggleSkill={handleToggleSkill}
          onClose={closeDropdown}
        />
      )}
    </div>
  );
};
