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
  /** Try injecting context as a file attachment; returns which path was used. */
  onInjectContext?: (content: string) => Promise<"file" | "text">;
};

export const Toolbar: React.FC<Props> = ({ platform, onInsertText, onInjectContext }) => {
  const [data, setData] = useState<ToolbarData>({ tools: [], skills: [] });
  const [activeDropdown, setActiveDropdown] = useState<"tools" | "skills" | null>(null);
  const [injectResult, setInjectResult] = useState<"file" | "text" | null>(null);

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
    const result = onInjectContext
      ? await onInjectContext(prompt)
      : (onInsertText(prompt), "text" as const);
    setInjectResult(result);
    setTimeout(() => setInjectResult(null), 3000);
  }, [data, onInsertText, onInjectContext]);

  const closeDropdown = useCallback(() => setActiveDropdown(null), []);

  const toolCount = data.tools.length;
  const activeSkillCount = data.skills.filter((s) => s.enabled).length;
  const hasAnything = toolCount > 0 || data.skills.length > 0;

  const injectIcon = injectResult === "file" ? "📎" : injectResult === "text" ? "📋" : "📋";
  const injectLabel =
    injectResult === "file" ? "File attached" :
    injectResult === "text" ? "Text injected" :
    "Inject Context";
  const injectTitle =
    injectResult === "file" ? "Context attached as mcp-context.md" :
    injectResult === "text" ? "Context inserted as text (file upload not supported)" :
    "Insert tool & skill descriptions into the chat";

  return (
    <div className={`toolbar toolbar--${platform}`}>
      {/* Inject Context */}
      {hasAnything && (
        <button
          className={`toolbar-btn ${injectResult ? "toolbar-btn--done" : "toolbar-btn--primary"}`}
          onClick={handleInjectContext}
          title={injectTitle}
          disabled={!!injectResult}
        >
          <span className="icon">{injectResult ? (injectResult === "file" ? "📎" : "✅") : injectIcon}</span>
          <span>{injectLabel}</span>
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
