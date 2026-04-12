// ---------------------------------------------------------------------------
// Skill data model
// ---------------------------------------------------------------------------

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
