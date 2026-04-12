/**
 * Extensible model fetcher — queries provider APIs for available models.
 *
 * To add a new provider:
 *  1. Implement a `ModelFetcher` function
 *  2. Register it in the `fetchers` map below
 */

import type { AiProviderId } from "../../shared/types";

export type ModelInfo = {
  id: string;
  label: string;
};

export type FetchModelsResult =
  | { ok: true; models: ModelInfo[] }
  | { ok: false; error: string };

export type ModelFetcher = (
  apiKey: string,
  baseUrl?: string,
) => Promise<FetchModelsResult>;

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

const fetchGeminiModels: ModelFetcher = async (apiKey) => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 400 || res.status === 403) {
        return { ok: false, error: "Invalid API key." };
      }
      return { ok: false, error: `Gemini API error ${res.status}: ${body.slice(0, 120)}` };
    }

    const data: { models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[] } =
      await res.json();

    const models: ModelInfo[] = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({
        id: (m.name ?? "").replace(/^models\//, ""),
        label: m.displayName ?? m.name ?? "",
      }))
      .filter((m) => m.id.length > 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) {
      return { ok: false, error: "No chat-capable models found for this key." };
    }
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error." };
  }
};

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

const fetchOpenAiModels: ModelFetcher = async (apiKey, baseUrl) => {
  const base = (baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) {
        return { ok: false, error: "Invalid API key." };
      }
      return { ok: false, error: `OpenAI API error ${res.status}: ${body.slice(0, 120)}` };
    }

    const data: { data?: { id?: string; owned_by?: string }[] } = await res.json();

    const models: ModelInfo[] = (data.data ?? [])
      .filter((m) => typeof m.id === "string" && m.id.length > 0)
      .map((m) => ({
        id: m.id!,
        label: m.id!,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (models.length === 0) {
      return { ok: false, error: "No models found for this key." };
    }
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error." };
  }
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const fetchers: Record<AiProviderId, ModelFetcher> = {
  gemini: fetchGeminiModels,
  openai: fetchOpenAiModels,
};

/** Fetch available models from the provider API. */
export const fetchModelsForProvider = (
  providerId: AiProviderId,
  apiKey: string,
  baseUrl?: string,
): Promise<FetchModelsResult> => {
  const fetcher = fetchers[providerId];
  if (!fetcher) {
    return Promise.resolve({ ok: false, error: `No model fetcher for provider "${providerId}".` });
  }
  return fetcher(apiKey, baseUrl);
};
