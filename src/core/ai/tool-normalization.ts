import type { NormalizedToolDefinition, ToolRisk } from "./types";

export type BrokerToolLike = {
  serverId: string;
  originalName: string;
  namespacedName: string;
  description?: string;
  inputSchema?: unknown;
  risk: ToolRisk;
  enabled: boolean;
};

export function normalizeBrokerTools(
  tools: BrokerToolLike[],
): NormalizedToolDefinition[] {
  return tools
    .filter((tool) => tool.enabled)
    .map((tool) => ({
      name: tool.namespacedName,
      description: tool.description,
      inputSchema: tool.inputSchema,
      risk: tool.risk,
      serverId: tool.serverId,
      originalName: tool.originalName,
    }));
}
