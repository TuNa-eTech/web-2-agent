import { loadSkillIndex, loadSkillContent } from "./skillStorage";
import { estimateTokens } from "./types";

/**
 * Assembles a system prompt from all enabled skills, respecting the token budget.
 *
 * Algorithm:
 * 1. Load enabled skills sorted by priority (ascending — lower = higher priority)
 * 2. For each skill, include core content if it fits the remaining budget
 * 3. Then include references in order if budget remains
 * 4. Skip a skill entirely if its core content exceeds remaining budget
 *
 * Returns `undefined` when no skills are enabled or all are empty.
 */
export const assembleSystemPrompt = async (): Promise<string | undefined> => {
  const index = await loadSkillIndex();

  const enabled = index.skills
    .filter((s) => s.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (enabled.length === 0) return undefined;

  let remaining = index.tokenBudget;
  const sections: string[] = [];

  for (const meta of enabled) {
    if (remaining <= 0) break;

    const content = await loadSkillContent(meta.id);
    if (!content || !content.coreContent.trim()) continue;

    const coreTokens = estimateTokens(content.coreContent);
    if (coreTokens > remaining) continue;

    sections.push(`## ${meta.name}\n\n${content.coreContent}`);
    remaining -= coreTokens;

    for (const ref of content.references) {
      if (remaining <= 0) break;
      const refTokens = estimateTokens(ref.content);
      if (refTokens > remaining) continue;

      sections.push(`### ${ref.name}\n\n${ref.content}`);
      remaining -= refTokens;
    }
  }

  if (sections.length === 0) return undefined;

  return `You have the following skills and knowledge:\n\n${sections.join("\n\n---\n\n")}`;
};
