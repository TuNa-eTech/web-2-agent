import { useCallback, useEffect, useState } from "react";
import type { SkillIndex, SkillMeta, SkillContent, SkillReference } from "../../core/skills/types";
import {
  loadSkillIndex,
  loadSkillContent,
  createSkill,
  updateSkill,
  deleteSkill,
  toggleSkill,
  reorderSkills,
  updateTokenBudget,
} from "../../core/skills/skillStorage";
import { EMPTY_SKILL_INDEX } from "../../core/skills/types";

type SkillsState = {
  loading: boolean;
  index: SkillIndex;
};

export const useSkills = () => {
  const [state, setState] = useState<SkillsState>({
    loading: true,
    index: { ...EMPTY_SKILL_INDEX, skills: [] },
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const index = await loadSkillIndex();
    setState({ loading: false, index });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (
    name: string,
    description: string,
    coreContent: string,
    references?: Omit<SkillReference, "id" | "tokenEstimate">[],
  ) => {
    await createSkill(name, description, coreContent, references);
    await reload();
  };

  const handleUpdate = async (
    id: string,
    updates: {
      name?: string;
      description?: string;
      coreContent?: string;
      references?: Omit<SkillReference, "id" | "tokenEstimate">[];
    },
  ) => {
    await updateSkill(id, updates);
    await reload();
  };

  const handleDelete = async (id: string) => {
    await deleteSkill(id);
    await reload();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleSkill(id, enabled);
    await reload();
  };

  const handleReorder = async (orderedIds: string[]) => {
    await reorderSkills(orderedIds);
    await reload();
  };

  const handleSetBudget = async (budget: number) => {
    await updateTokenBudget(budget);
    await reload();
  };

  const getContent = (id: string) => loadSkillContent(id);

  return {
    loading: state.loading,
    skills: state.index.skills,
    tokenBudget: state.index.tokenBudget,
    create: handleCreate,
    update: handleUpdate,
    remove: handleDelete,
    toggle: handleToggle,
    reorder: handleReorder,
    setBudget: handleSetBudget,
    getContent,
    reload,
  };
};
