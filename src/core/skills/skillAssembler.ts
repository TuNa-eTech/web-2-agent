import { loadSkillIndex, loadSkillContent } from "./skillStorage";
import type { SkillMeta, SkillContent, SkillIndex, SkillKind } from "./types";
import { estimateTokens } from "./types";

// ---------------------------------------------------------------------------
// Kind → section header
// ---------------------------------------------------------------------------

const KIND_HEADERS: Record<SkillKind, string> = {
  agent: "# Agent Role & Capabilities",
  soul: "# Personality & Voice",
  tools: "# Tools Reference",
  workflow: "# Workflow To Follow",
  general: "",
};

const KIND_ORDER: SkillKind[] = ["agent", "soul", "tools", "workflow", "general"];

// ---------------------------------------------------------------------------
// Tag matching
// ---------------------------------------------------------------------------

const normalizeWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Check if a user message matches any of a skill's tags.
 * Uses simple word-boundary matching — fast, no NLP dependency.
 */
const matchesTags = (userMessage: string, tags: string[]): boolean => {
  if (tags.length === 0) return false;
  const words = new Set(userMessage.toLowerCase().split(/\s+/).map(normalizeWord));
  return tags.some((tag) => {
    const normalized = normalizeWord(tag);
    // Exact word match
    if (words.has(normalized)) return true;
    // Substring match for multi-word tags or partial matches
    return userMessage.toLowerCase().includes(tag.toLowerCase());
  });
};

// ---------------------------------------------------------------------------
// Cached assembler
// ---------------------------------------------------------------------------

type CachedSkillData = {
  index: SkillIndex;
  contents: Map<string, SkillContent>;
};

let cache: CachedSkillData | null = null;
let storageListenerRegistered = false;

/** Invalidate cache when skills change in storage */
const ensureStorageListener = () => {
  if (storageListenerRegistered) return;
  storageListenerRegistered = true;

  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      const hasSkillChange = Object.keys(changes).some(
        (key) => key.startsWith("skills."),
      );
      if (hasSkillChange) cache = null;
    });
  }
};

/** Load index + all enabled skill contents, using cache when available */
const loadSkillData = async (): Promise<CachedSkillData> => {
  ensureStorageListener();

  if (cache) return cache;

  const index = await loadSkillIndex();
  const enabledIds = index.skills
    .filter((s) => s.enabled)
    .map((s) => s.id);

  const entries = await Promise.all(
    enabledIds.map(async (id) => {
      const content = await loadSkillContent(id);
      return [id, content] as const;
    }),
  );

  const contents = new Map<string, SkillContent>();
  for (const [id, content] of entries) {
    if (content) contents.set(id, content);
  }

  cache = { index, contents };
  return cache;
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * Build a section string from a skill's content within the remaining budget.
 * Returns the assembled text and tokens consumed, or null if core doesn't fit.
 */
const buildSkillSection = (
  meta: SkillMeta,
  content: SkillContent,
  remaining: number,
): { text: string; tokensUsed: number } | null => {
  if (!content.coreContent.trim()) return null;

  const coreTokens = estimateTokens(content.coreContent);
  if (coreTokens > remaining) return null;

  const kind = meta.kind ?? "general";
  const kindHeader = KIND_HEADERS[kind];
  const header = kindHeader
    ? `${kindHeader} — ${meta.name}`
    : `## ${meta.name}`;

  const parts: string[] = [`${header}\n\n${content.coreContent}`];
  let used = coreTokens;

  for (const ref of content.references) {
    const refTokens = estimateTokens(ref.content);
    if (used + refTokens > remaining) continue;
    parts.push(`### ${ref.name}\n\n${ref.content}`);
    used += refTokens;
  }

  return { text: parts.join("\n\n"), tokensUsed: used };
};

/**
 * Assembles the system prompt from enabled skills.
 *
 * Strategy:
 * 1. Cache: skill data loaded once, invalidated via chrome.storage.onChanged
 * 2. "always" skills: included every turn (no matching needed)
 * 3. "auto" skills: included only when userMessage matches their tags
 * 4. Both tiers sorted by priority, respecting token budget
 *
 * @param userMessage - current user message for tag matching (optional for backward compat)
 */
export const assembleSystemPrompt = async (
  userMessage?: string,
): Promise<string | undefined> => {
  const { index, contents } = await loadSkillData();

  const enabled = index.skills
    .filter((s) => s.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (enabled.length === 0) return undefined;

  // Partition into always vs auto
  const alwaysSkills = enabled.filter((s) => s.injection === "always");
  const autoSkills = userMessage
    ? enabled.filter((s) => s.injection === "auto" && matchesTags(userMessage, s.tags))
    : [];

  // Merge: always first, then matched auto skills — then re-group by kind so
  // the final prompt reads in a natural order (agent → soul → tools → workflow → general).
  // Within each kind, relative order (and priority) from the merge above is preserved.
  const merged = [...alwaysSkills, ...autoSkills];
  if (merged.length === 0) return undefined;

  const byKind = new Map<SkillKind, SkillMeta[]>();
  for (const s of merged) {
    const k = s.kind ?? "general";
    const bucket = byKind.get(k) ?? [];
    bucket.push(s);
    byKind.set(k, bucket);
  }
  const selected = KIND_ORDER.flatMap((k) => byKind.get(k) ?? []);

  let remaining = index.tokenBudget;
  const sections: string[] = [];

  for (const meta of selected) {
    if (remaining <= 0) break;

    const content = contents.get(meta.id);
    if (!content) continue;

    const result = buildSkillSection(meta, content, remaining);
    if (!result) continue;

    sections.push(result.text);
    remaining -= result.tokensUsed;
  }

  if (sections.length === 0) return undefined;

  return `You have the following skills and knowledge:\n\n${sections.join("\n\n---\n\n")}`;
};

/** Force cache invalidation (e.g., when called from tests) */
export const invalidateSkillCache = () => {
  cache = null;
};
