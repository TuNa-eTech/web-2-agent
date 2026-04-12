export const namespaceToolName = (serverId: string, toolName: string): string =>
  `${serverId}__${toolName}`;

export const parseNamespacedToolName = (
  namespacedName: string
): { serverId: string; originalName: string } | null => {
  const separator = "__";
  const index = namespacedName.indexOf(separator);
  if (index <= 0) {
    return null;
  }
  return {
    serverId: namespacedName.slice(0, index),
    originalName: namespacedName.slice(index + separator.length),
  };
};
