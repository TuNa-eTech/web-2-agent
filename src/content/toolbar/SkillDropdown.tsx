// ---------------------------------------------------------------------------
// Skills dropdown component
// ---------------------------------------------------------------------------

import React from "react";
import type { ToolbarSkill } from "../data";

type Props = {
  skills: ToolbarSkill[];
  onToggleSkill: (skillId: string, enabled: boolean) => void;
  onClose: () => void;
};

export const SkillDropdown: React.FC<Props> = ({ skills, onToggleSkill, onClose }) => (
  <>
    <div className="dropdown-overlay" onClick={onClose} />
    <div className="dropdown">
      <div className="dropdown-header">Skills</div>
      {skills.length === 0 ? (
        <div className="dropdown-empty">
          No skills configured.<br />
          Create skills in the Options page.
        </div>
      ) : (
        skills.map((skill) => (
          <div
            key={skill.id}
            className="dropdown-item"
            onClick={() => onToggleSkill(skill.id, !skill.enabled)}
          >
            <span className="item-icon">📝</span>
            <div className="item-info">
              <div className="item-name">{skill.name}</div>
              {skill.description && (
                <div className="item-desc">{skill.description}</div>
              )}
            </div>
            <span className="injection-badge">{skill.injection}</span>
            <button
              className={`toggle ${skill.enabled ? "toggle--on" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSkill(skill.id, !skill.enabled);
              }}
              aria-label={`Toggle ${skill.name}`}
            />
          </div>
        ))
      )}
    </div>
  </>
);
