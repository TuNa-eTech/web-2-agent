import { getStorageItem, setStorageItem, removeStorageItems } from "../storage/storageAdapter";
import { STORAGE_KEYS } from "../storage/storageKeys";
import {
  type SkillIndex,
  type SkillMeta,
  type SkillContent,
  type SkillReference,
  EMPTY_SKILL_INDEX,
  estimateTokens,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const shortId = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------------------
// Index CRUD
// ---------------------------------------------------------------------------

export const loadSkillIndex = async (): Promise<SkillIndex> => {
  const stored = await getStorageItem<SkillIndex>(STORAGE_KEYS.skillIndex);
  return stored ?? { ...EMPTY_SKILL_INDEX, skills: [] };
};

export const saveSkillIndex = (index: SkillIndex): Promise<void> =>
  setStorageItem(STORAGE_KEYS.skillIndex, index);

// ---------------------------------------------------------------------------
// Content CRUD
// ---------------------------------------------------------------------------

export const loadSkillContent = async (id: string): Promise<SkillContent | null> => {
  return getStorageItem<SkillContent>(STORAGE_KEYS.skillContent(id));
};

export const saveSkillContent = (id: string, content: SkillContent): Promise<void> =>
  setStorageItem(STORAGE_KEYS.skillContent(id), content);

// ---------------------------------------------------------------------------
// High-level operations
// ---------------------------------------------------------------------------

export const createSkill = async (
  name: string,
  description: string,
  coreContent: string,
  references: Omit<SkillReference, "id" | "tokenEstimate">[] = [],
): Promise<SkillMeta> => {
  const index = await loadSkillIndex();
  const now = new Date().toISOString();

  const refs: SkillReference[] = references.map((r) => ({
    id: shortId(),
    name: r.name,
    content: r.content,
    tokenEstimate: estimateTokens(r.content),
  }));

  const coreTokenEstimate = estimateTokens(coreContent);
  const totalTokenEstimate =
    coreTokenEstimate + refs.reduce((sum, r) => sum + r.tokenEstimate, 0);

  const meta: SkillMeta = {
    id: shortId(),
    name,
    description,
    enabled: true,
    priority: index.skills.length,
    coreTokenEstimate,
    totalTokenEstimate,
    createdAt: now,
    updatedAt: now,
  };

  const content: SkillContent = { coreContent, references: refs };

  const updated: SkillIndex = {
    ...index,
    skills: [...index.skills, meta],
  };

  await Promise.all([saveSkillIndex(updated), saveSkillContent(meta.id, content)]);
  return meta;
};

export const updateSkill = async (
  id: string,
  updates: {
    name?: string;
    description?: string;
    coreContent?: string;
    references?: Omit<SkillReference, "id" | "tokenEstimate">[];
  },
): Promise<void> => {
  const [index, existingContent] = await Promise.all([
    loadSkillIndex(),
    loadSkillContent(id),
  ]);

  if (!existingContent) throw new Error(`Skill content not found: ${id}`);

  const coreContent = updates.coreContent ?? existingContent.coreContent;
  const refs: SkillReference[] = updates.references
    ? updates.references.map((r) => ({
        id: shortId(),
        name: r.name,
        content: r.content,
        tokenEstimate: estimateTokens(r.content),
      }))
    : existingContent.references;

  const coreTokenEstimate = estimateTokens(coreContent);
  const totalTokenEstimate =
    coreTokenEstimate + refs.reduce((sum, r) => sum + r.tokenEstimate, 0);

  const updatedIndex: SkillIndex = {
    ...index,
    skills: index.skills.map((s) =>
      s.id === id
        ? {
            ...s,
            name: updates.name ?? s.name,
            description: updates.description ?? s.description,
            coreTokenEstimate,
            totalTokenEstimate,
            updatedAt: new Date().toISOString(),
          }
        : s,
    ),
  };

  const updatedContent: SkillContent = { coreContent, references: refs };

  await Promise.all([
    saveSkillIndex(updatedIndex),
    saveSkillContent(id, updatedContent),
  ]);
};

export const deleteSkill = async (id: string): Promise<void> => {
  const index = await loadSkillIndex();
  const updated: SkillIndex = {
    ...index,
    skills: index.skills
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, priority: i })),
  };
  await Promise.all([
    saveSkillIndex(updated),
    removeStorageItems([STORAGE_KEYS.skillContent(id)]),
  ]);
};

export const toggleSkill = async (id: string, enabled: boolean): Promise<void> => {
  const index = await loadSkillIndex();
  const updated: SkillIndex = {
    ...index,
    skills: index.skills.map((s) =>
      s.id === id ? { ...s, enabled, updatedAt: new Date().toISOString() } : s,
    ),
  };
  await saveSkillIndex(updated);
};

export const reorderSkills = async (orderedIds: string[]): Promise<void> => {
  const index = await loadSkillIndex();
  const byId = new Map(index.skills.map((s) => [s.id, s]));
  const reordered = orderedIds
    .map((id) => byId.get(id))
    .filter((s): s is SkillMeta => s != null)
    .map((s, i) => ({ ...s, priority: i }));

  await saveSkillIndex({ ...index, skills: reordered });
};

export const updateTokenBudget = async (budget: number): Promise<void> => {
  const index = await loadSkillIndex();
  await saveSkillIndex({ ...index, tokenBudget: budget });
};
