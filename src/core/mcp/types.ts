export type McpInitializeResult = {
  serverInfo?: {
    name?: string;
    version?: string;
  };
  capabilities?: Record<string, unknown>;
};

export type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type McpListToolsResult = {
  tools: McpToolDefinition[];
};

export type McpCallToolResult = unknown;
