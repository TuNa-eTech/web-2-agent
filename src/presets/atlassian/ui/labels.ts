import { AtlassianCapability } from "../capability-map";

export type AtlassianCapabilityGroup = "jira" | "confluence";

export type AtlassianCapabilityLabel = {
  group: AtlassianCapabilityGroup;
  label: string;
  description: string;
};

export const ATLASSIAN_PRESET_LABEL = "Atlassian";

export const ATLASSIAN_CAPABILITY_LABELS: Record<
  AtlassianCapability,
  AtlassianCapabilityLabel
> = {
  "jira.search": {
    group: "jira",
    label: "Jira search",
    description: "Search Jira issues with JQL.",
  },
  "jira.recent": {
    group: "jira",
    label: "Recent issues",
    description: "Fetch recently updated issues.",
  },
  "jira.read": {
    group: "jira",
    label: "Issue details",
    description: "Read issue details and metadata.",
  },
  "jira.create": {
    group: "jira",
    label: "Create issues",
    description: "Create new Jira issues.",
  },
  "jira.update": {
    group: "jira",
    label: "Update issues",
    description: "Edit issues, transitions, and comments.",
  },
  "confluence.search": {
    group: "confluence",
    label: "Confluence search",
    description: "Search Confluence pages with CQL.",
  },
  "confluence.read": {
    group: "confluence",
    label: "Read pages",
    description: "Fetch Confluence page content.",
  },
  "confluence.create": {
    group: "confluence",
    label: "Create pages",
    description: "Create new Confluence pages.",
  },
  "confluence.update": {
    group: "confluence",
    label: "Update pages",
    description: "Update existing Confluence pages.",
  },
};

export const ATLASSIAN_GROUP_LABELS: Record<AtlassianCapabilityGroup, string> = {
  jira: "Jira",
  confluence: "Confluence",
};
