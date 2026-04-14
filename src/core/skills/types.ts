// ---------------------------------------------------------------------------
// Skill data model
// ---------------------------------------------------------------------------

export type SkillInjection = "always" | "auto";

export type SkillKind = "general" | "agent" | "soul" | "tools" | "workflow";

export const SKILL_KINDS: SkillKind[] = [
  "general",
  "agent",
  "soul",
  "tools",
  "workflow",
];

export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  general: "General",
  agent: "Agent",
  soul: "Soul",
  tools: "Tools",
  workflow: "Workflow",
};

export type SkillReference = {
  id: string;
  name: string;
  content: string;
  tokenEstimate: number;
};

export type SkillContent = {
  coreContent: string;
  references: SkillReference[];
};

export type SkillMeta = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  injection: SkillInjection;
  kind: SkillKind;
  tags: string[];
  priority: number;
  coreTokenEstimate: number;
  totalTokenEstimate: number;
  createdAt: string;
  updatedAt: string;
};

export type SkillIndex = {
  version: 1;
  tokenBudget: number;
  skills: SkillMeta[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const EMPTY_SKILL_INDEX: SkillIndex = {
  version: 1,
  tokenBudget: 4000,
  skills: [],
};

export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);
