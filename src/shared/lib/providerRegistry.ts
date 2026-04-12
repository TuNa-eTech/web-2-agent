import type { AiProviderId, ProviderMeta } from "../types";

const registry: ProviderMeta[] = [
  {
    id: "gemini",
    displayName: "Google Gemini",
    apiKeyPlaceholder: "AIzaSy...",
    apiKeyHelpUrl: "https://aistudio.google.com/apikey",
    defaultModelId: "gemini-2.5-flash",
    supportsBaseUrl: false,
  },
  {
    id: "openai",
    displayName: "OpenAI",
    apiKeyPlaceholder: "sk-...",
    apiKeyHelpUrl: "https://platform.openai.com/api-keys",
    defaultModelId: "gpt-4o",
    supportsBaseUrl: true,
    defaultBaseUrl: "https://api.openai.com/v1",
  },
];

export const getProviderRegistry = (): readonly ProviderMeta[] => registry;

export const getProviderMeta = (id: AiProviderId): ProviderMeta | undefined =>
  registry.find((p) => p.id === id);

export const getProviderIds = (): AiProviderId[] => registry.map((p) => p.id);
