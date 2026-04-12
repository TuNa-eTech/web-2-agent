import type { BrokerTool, ToolPolicy } from "../../shared/types";

export type PolicyRejection = {
  category: "policy";
  code:
    | "SERVER_DISABLED"
    | "TOOL_BLOCKED"
    | "TOOL_NOT_ALLOWED"
    | "CONFIRMATION_REQUIRED";
  message: string;
  serverId: string;
  toolName: string;
  namespacedName: string;
  risk: BrokerTool["risk"];
  requiresConfirmation?: boolean;
};

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; rejection: PolicyRejection };

const WRITE_HINTS = [
  "create",
  "update",
  "delete",
  "remove",
  "set",
  "put",
  "post",
  "add",
  "merge",
  "write",
  "edit",
  "assign",
  "grant",
  "revoke",
  "execute",
  "run",
  "move",
  "upload",
  "import",
  "export",
  "publish",
  "close",
  "reopen",
  "archive",
  "restore",
  "patch",
];

const READ_HINTS = [
  "get",
  "list",
  "search",
  "fetch",
  "read",
  "query",
  "describe",
  "show",
  "status",
  "preview",
  "download",
];

const normalize = (value: string): string => value.toLowerCase();

export const classifyToolRisk = (
  toolName: string,
  description?: string
): BrokerTool["risk"] => {
  const haystack = `${toolName} ${description ?? ""}`.toLowerCase();
  if (WRITE_HINTS.some((hint) => haystack.includes(hint))) {
    return "write";
  }
  if (READ_HINTS.some((hint) => haystack.includes(hint))) {
    return "read";
  }
  return "unknown";
};

export const evaluateToolPolicy = (input: {
  policy: ToolPolicy;
  serverId: string;
  toolName: string;
  namespacedName: string;
  risk: BrokerTool["risk"];
  confirmed?: boolean;
}): PolicyDecision => {
  const { policy, serverId, toolName, namespacedName, risk, confirmed } = input;

  if (!policy.serverEnabled) {
    return {
      allowed: false,
      rejection: {
        category: "policy",
        code: "SERVER_DISABLED",
        message: "Server is disabled.",
        serverId,
        toolName,
        namespacedName,
        risk,
      },
    };
  }

  const normalizedTool = normalize(toolName);
  const normalizedNamespaced = normalize(namespacedName);

  if (
    policy.blockedTools.some(
      (blocked) =>
        normalize(blocked) === normalizedTool ||
        normalize(blocked) === normalizedNamespaced
    )
  ) {
    return {
      allowed: false,
      rejection: {
        category: "policy",
        code: "TOOL_BLOCKED",
        message: "Tool is blocked by policy.",
        serverId,
        toolName,
        namespacedName,
        risk,
      },
    };
  }

  if (policy.allowedTools.length > 0) {
    const allowed = policy.allowedTools.some(
      (allowedTool) =>
        normalize(allowedTool) === normalizedTool ||
        normalize(allowedTool) === normalizedNamespaced
    );
    if (!allowed) {
      return {
        allowed: false,
        rejection: {
          category: "policy",
          code: "TOOL_NOT_ALLOWED",
          message: "Tool is not in the allowlist.",
          serverId,
          toolName,
          namespacedName,
          risk,
        },
      };
    }
  }

  if (policy.confirmWrites && (risk === "write" || risk === "unknown")) {
    if (!confirmed) {
      return {
        allowed: false,
        rejection: {
          category: "policy",
          code: "CONFIRMATION_REQUIRED",
          message: "Confirmation required for write or unknown risk tools.",
          serverId,
          toolName,
          namespacedName,
          risk,
          requiresConfirmation: true,
        },
      };
    }
  }

  return { allowed: true };
};

export const applyToolPolicyToCatalog = (
  tools: BrokerTool[],
  policy: ToolPolicy
): BrokerTool[] =>
  tools.map((tool) => {
    const decision = evaluateToolPolicy({
      policy,
      serverId: tool.serverId,
      toolName: tool.originalName,
      namespacedName: tool.namespacedName,
      risk: tool.risk,
      confirmed: true,
    });
    return {
      ...tool,
      enabled: decision.allowed,
    };
  });
