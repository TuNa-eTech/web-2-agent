/**
 * Extensible AI provider configuration contracts.
 *
 * To add a new provider:
 *  1. Add its id to `AiProviderId`
 *  2. Add a `ProviderMeta` entry in the registry (providerRegistry.ts)
 *  3. Implement the `ProviderAdapter` (core/ai/providers/)
 */

/** Union of built-in provider identifiers. Extend this when adding providers. */
export type AiProviderId = "gemini" | "openai";

/** Static metadata that describes a provider (never stored encrypted). */
export type ProviderMeta = {
  id: AiProviderId;
  displayName: string;
  /** Placeholder shown in the API key input. */
  apiKeyPlaceholder: string;
  /** Help URL for obtaining an API key. */
  apiKeyHelpUrl: string;
  /** Fallback model id used before the model list is fetched from the API. */
  defaultModelId: string;
  /** Optional base URL override hint (e.g. for proxies). */
  supportsBaseUrl: boolean;
  defaultBaseUrl?: string;
};

/** Per-provider configuration persisted in storage (API key is encrypted). */
export type ProviderConfig = {
  providerId: AiProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
};

/** Top-level store shape written to chrome.storage. */
export type ProviderSettingsStore = {
  version: 1;
  providers: ProviderConfig[];
};
