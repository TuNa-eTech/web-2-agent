export type AtlassianCapability =
  | "jira.search"
  | "jira.recent"
  | "jira.read"
  | "jira.create"
  | "jira.update"
  | "confluence.search"
  | "confluence.read"
  | "confluence.create"
  | "confluence.update";

export type AtlassianCapabilityMap = Record<AtlassianCapability, string[]>;

type ToolMatcher = RegExp | ((toolName: string) => boolean);

type CapabilityRule = {
  capability: AtlassianCapability;
  matchers: ToolMatcher[];
};

const JIRA_RULES: CapabilityRule[] = [
  {
    capability: "jira.search",
    matchers: [/jira.*search/i, /jira.*jql/i, /jira.*query/i],
  },
  {
    capability: "jira.recent",
    matchers: [/jira.*recent/i, /jira.*my.*issues/i],
  },
  {
    capability: "jira.read",
    matchers: [/jira.*get.*issue/i, /jira.*issue.*get/i, /jira.*list.*issue/i],
  },
  {
    capability: "jira.create",
    matchers: [/jira.*create.*issue/i, /jira.*create/i],
  },
  {
    capability: "jira.update",
    matchers: [/jira.*update/i, /jira.*edit/i, /jira.*transition/i, /jira.*comment/i],
  },
];

const CONFLUENCE_RULES: CapabilityRule[] = [
  {
    capability: "confluence.search",
    matchers: [/confluence.*search/i, /confluence.*cql/i, /confluence.*query/i],
  },
  {
    capability: "confluence.read",
    matchers: [/confluence.*get.*page/i, /confluence.*page.*get/i, /confluence.*content.*get/i],
  },
  {
    capability: "confluence.create",
    matchers: [/confluence.*create.*page/i, /confluence.*create.*content/i],
  },
  {
    capability: "confluence.update",
    matchers: [/confluence.*update.*page/i, /confluence.*edit.*page/i],
  },
];

const ALL_RULES = [...JIRA_RULES, ...CONFLUENCE_RULES];

const stripNamespace = (toolName: string): string => {
  const marker = toolName.indexOf("__");
  return marker === -1 ? toolName : toolName.slice(marker + 2);
};

const matchesTool = (toolName: string, matcher: ToolMatcher): boolean => {
  if (matcher instanceof RegExp) {
    return matcher.test(toolName);
  }
  return matcher(toolName);
};

export const deriveAtlassianCapabilities = (
  tools: string[],
): {
  capabilities: AtlassianCapabilityMap;
  detected: Set<AtlassianCapability>;
} => {
  const capabilities: AtlassianCapabilityMap = {
    "jira.search": [],
    "jira.recent": [],
    "jira.read": [],
    "jira.create": [],
    "jira.update": [],
    "confluence.search": [],
    "confluence.read": [],
    "confluence.create": [],
    "confluence.update": [],
  };

  const detected = new Set<AtlassianCapability>();

  for (const tool of tools) {
    const normalized = stripNamespace(tool);
    for (const rule of ALL_RULES) {
      if (rule.matchers.some((matcher) => matchesTool(normalized, matcher))) {
        capabilities[rule.capability].push(tool);
        detected.add(rule.capability);
      }
    }
  }

  return { capabilities, detected };
};

export const hasAnyAtlassianCapability = (
  detected: Set<AtlassianCapability>,
  capabilities: AtlassianCapability[],
): boolean => {
  for (const capability of capabilities) {
    if (detected.has(capability)) {
      return true;
    }
  }
  return false;
};
