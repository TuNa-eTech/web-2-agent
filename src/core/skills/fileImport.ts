import type { SkillKind, SkillInjection } from "./types";
import { SKILL_KINDS } from "./types";

export type ImportedSkill = {
  name: string;
  description: string;
  coreContent: string;
  injection: SkillInjection;
  tags: string[];
  kind: SkillKind;
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const FILENAME_KIND_PATTERNS: Array<[RegExp, SkillKind]> = [
  [/^agents?\b/i, "agent"],
  [/^soul\b/i, "soul"],
  [/^tools?\b/i, "tools"],
  [/^workflow\b/i, "workflow"],
  [/^claude\b/i, "agent"],
];

const parseTagList = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];
  // Support YAML flow "[a, b]" and plain "a, b"
  const stripped = trimmed.replace(/^\[|\]$/g, "");
  return stripped
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
};

const parseFrontmatter = (
  raw: string,
): { meta: Record<string, string>; body: string } | null => {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return null;

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key && value) meta[key] = value;
  }
  return { meta, body: match[2] };
};

export const detectKindFromFilename = (filename: string): SkillKind => {
  const base = filename.replace(/\.[^.]+$/, "");
  for (const [pattern, kind] of FILENAME_KIND_PATTERNS) {
    if (pattern.test(base)) return kind;
  }
  return "general";
};

const normalizeKind = (raw: string | undefined, fallback: SkillKind): SkillKind => {
  if (!raw) return fallback;
  const lower = raw.toLowerCase().trim();
  return (SKILL_KINDS as string[]).includes(lower) ? (lower as SkillKind) : fallback;
};

const prettifyName = (filename: string): string => {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const importSkillFromMarkdown = (
  filename: string,
  raw: string,
): ImportedSkill => {
  const fallbackKind = detectKindFromFilename(filename);
  const parsed = parseFrontmatter(raw);

  if (parsed) {
    const { meta, body } = parsed;
    const name = meta.name || prettifyName(filename);
    const description = meta.description ?? "";
    const kind = normalizeKind(meta.kind, fallbackKind);
    const tags = meta.tags ? parseTagList(meta.tags) : [];
    const injectionRaw = (meta.injection || "").toLowerCase();
    const injection: SkillInjection =
      injectionRaw === "auto" ? "auto" : "always";
    return {
      name,
      description,
      coreContent: body.replace(/^\s*\n/, ""),
      injection,
      tags,
      kind,
    };
  }

  return {
    name: prettifyName(filename),
    description: "",
    coreContent: raw,
    injection: "always",
    tags: [],
    kind: fallbackKind,
  };
};
