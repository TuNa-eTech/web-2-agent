import type { RawMcpConfigDocument } from "../../../shared/types";

export type AtlassianConfigExample = {
  id: "uvx" | "http";
  title: string;
  description: string;
  document: RawMcpConfigDocument;
};

const DEFAULT_SERVER_ID = "atlassian";

export const ATLASSIAN_UVX_EXAMPLE: AtlassianConfigExample = {
  id: "uvx",
  title: "Local uvx mcp-atlassian",
  description:
    "Runs mcp-atlassian locally via uvx and the desktop companion.",
  document: {
    mcpServers: {
      [DEFAULT_SERVER_ID]: {
        command: "uvx",
        args: ["mcp-atlassian"],
        stdioProtocol: "json-lines",
        env: {
          JIRA_URL: "https://your-domain.atlassian.net",
          JIRA_USERNAME: "you@example.com",
          JIRA_API_TOKEN: "your_jira_api_token",
          CONFLUENCE_URL: "https://your-domain.atlassian.net/wiki",
          CONFLUENCE_USERNAME: "you@example.com",
          CONFLUENCE_API_TOKEN: "your_confluence_api_token",
        },
        preset: "atlassian",
      },
    },
  },
};

export const ATLASSIAN_HTTP_EXAMPLE: AtlassianConfigExample = {
  id: "http",
  title: "Remote HTTP MCP endpoint",
  description:
    "Connects to an HTTP MCP server that proxies Atlassian with auth headers.",
  document: {
    mcpServers: {
      [DEFAULT_SERVER_ID]: {
        transport: "streamable-http",
        url: "https://mcp-atlassian.example.com/mcp",
        headers: {
          Authorization: "Bearer your_api_token",
        },
        preset: "atlassian",
      },
    },
  },
};

export const ATLASSIAN_CONFIG_EXAMPLES: AtlassianConfigExample[] = [
  ATLASSIAN_UVX_EXAMPLE,
  ATLASSIAN_HTTP_EXAMPLE,
];

export const serializeConfigExample = (
  example: AtlassianConfigExample,
): string => {
  return JSON.stringify(example.document, null, 2);
};
