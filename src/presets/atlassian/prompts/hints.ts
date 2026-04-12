import { AtlassianCapability } from "../capability-map";

export type AtlassianPromptHint = {
  id: string;
  title: string;
  body: string;
};

export const getAtlassianPromptHints = (
  detected: Set<AtlassianCapability>,
): AtlassianPromptHint[] => {
  const hints: AtlassianPromptHint[] = [
    {
      id: "atlassian.context",
      title: "Include site context",
      body:
        "Include the Atlassian site URL and project/space keys so tool calls stay scoped.",
    },
  ];

  const hasJira =
    detected.has("jira.search") ||
    detected.has("jira.read") ||
    detected.has("jira.create") ||
    detected.has("jira.update");

  const hasConfluence =
    detected.has("confluence.search") ||
    detected.has("confluence.read") ||
    detected.has("confluence.create") ||
    detected.has("confluence.update");

  if (hasJira) {
    hints.push(
      {
        id: "jira.jql",
        title: "Prefer JQL for Jira search",
        body: "Use JQL filters like `project = KEY order by updated desc`.",
      },
      {
        id: "jira.create",
        title: "Issue creation details",
        body: "Provide project key, issue type, summary, and description.",
      },
    );
  }

  if (hasConfluence) {
    hints.push(
      {
        id: "confluence.cql",
        title: "Use CQL for Confluence search",
        body: "Use CQL filters like `space = ABC and type = page`.",
      },
      {
        id: "confluence.page",
        title: "Page operations",
        body: "Include space key, parent page, and title when creating pages.",
      },
    );
  }

  return hints;
};
