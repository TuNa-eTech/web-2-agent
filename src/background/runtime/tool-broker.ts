import type { BrokerTool, ToolPolicy } from "../../shared/types";
import type { McpToolDefinition } from "../../core/mcp/types";
import { applyToolPolicyToCatalog, classifyToolRisk } from "../../core/permissions/toolPolicy";
import { namespaceToolName } from "../../core/utils/namespacing";

export const DEFAULT_TOOL_POLICY: ToolPolicy = {
  serverEnabled: true,
  allowedTools: [],
  blockedTools: [],
  confirmWrites: true,
};

export type ToolBroker = {
  normalizeDiscoveredTools: (
    serverId: string,
    tools: McpToolDefinition[],
    policy?: ToolPolicy,
  ) => BrokerTool[];
};

export const createToolBroker = (): ToolBroker => ({
  normalizeDiscoveredTools: (serverId, tools, policy = DEFAULT_TOOL_POLICY) => {
    const catalog = tools.map<BrokerTool>((tool) => ({
      serverId,
      originalName: tool.name,
      namespacedName: namespaceToolName(serverId, tool.name),
      description: tool.description ?? "",
      inputSchema: tool.inputSchema ?? {},
      risk: classifyToolRisk(tool.name, tool.description),
      enabled: true,
    }));

    return applyToolPolicyToCatalog(catalog, policy);
  },
});
