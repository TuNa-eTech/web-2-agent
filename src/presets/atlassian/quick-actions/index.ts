import {
  AtlassianCapability,
  deriveAtlassianCapabilities,
  hasAnyAtlassianCapability,
} from "../capability-map";

export type AtlassianQuickAction = {
  id:
    | "jira.search"
    | "jira.recent"
    | "jira.create"
    | "confluence.search"
    | "confluence.create";
  title: string;
  description: string;
  requirements: {
    allOf?: AtlassianCapability[];
    anyOf?: AtlassianCapability[];
  };
};

export type AtlassianQuickActionAvailability = {
  action: AtlassianQuickAction;
  available: boolean;
  missingCapabilities: AtlassianCapability[];
};

const ACTIONS: AtlassianQuickAction[] = [
  {
    id: "jira.search",
    title: "Jira search",
    description: "Search issues with JQL.",
    requirements: {
      allOf: ["jira.search"],
    },
  },
  {
    id: "jira.recent",
    title: "Recent issues",
    description: "Pull recently updated issues.",
    requirements: {
      anyOf: ["jira.recent", "jira.search"],
    },
  },
  {
    id: "jira.create",
    title: "Create issue",
    description: "Create a new Jira issue.",
    requirements: {
      allOf: ["jira.create"],
    },
  },
  {
    id: "confluence.search",
    title: "Confluence search",
    description: "Search pages with CQL.",
    requirements: {
      allOf: ["confluence.search"],
    },
  },
  {
    id: "confluence.create",
    title: "Create page",
    description: "Create a new Confluence page.",
    requirements: {
      anyOf: ["confluence.create", "confluence.update"],
    },
  },
];

const isActionAvailable = (
  action: AtlassianQuickAction,
  detected: Set<AtlassianCapability>,
): { available: boolean; missing: AtlassianCapability[] } => {
  const missing: AtlassianCapability[] = [];
  const { allOf, anyOf } = action.requirements;

  if (allOf) {
    for (const capability of allOf) {
      if (!detected.has(capability)) {
        missing.push(capability);
      }
    }
  }

  if (anyOf && !hasAnyAtlassianCapability(detected, anyOf)) {
    missing.push(...anyOf);
  }

  return { available: missing.length === 0, missing };
};

export const deriveAtlassianQuickActions = (
  tools: string[],
): AtlassianQuickActionAvailability[] => {
  const { detected } = deriveAtlassianCapabilities(tools);
  return ACTIONS.map((action) => {
    const { available, missing } = isActionAvailable(action, detected);
    return {
      action,
      available,
      missingCapabilities: missing,
    };
  });
};

export const getAvailableAtlassianQuickActions = (
  tools: string[],
): AtlassianQuickAction[] => {
  return deriveAtlassianQuickActions(tools)
    .filter((entry) => entry.available)
    .map((entry) => entry.action);
};
