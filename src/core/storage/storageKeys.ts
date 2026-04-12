export const STORAGE_KEYS = {
  encryptionKey: "mcp.storage.encryptionKey",
  encryptedConfig: "mcp.storage.encryptedConfig",
  serverIndex: "mcp.storage.serverIndex",
  connectionHealth: "mcp.storage.connectionHealth",
  toolCatalog: "mcp.storage.toolCatalog",
  providerSettings: "ai.storage.providerSettings",
  mcpPreferences: "mcp.storage.preferences",
  conversationIndex: "ai.conversations.index",
  conversationMessages: (id: string) => `ai.conversations.${id}.messages`,
  skillIndex: "skills.index",
  skillContent: (id: string) => `skills.content.${id}`,
};
