import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { loadProviderSettings } from "../storage/providerStorage";
import { getStorageItem } from "../storage/storageAdapter";
import type { AnswerSuggestion } from "./port-contracts";
import type { ProviderConfig } from "../../shared/types";

const SYSTEM_PROMPT = `You turn confirmation questions into 2-4 short first-person user replies.
Return ONLY JSON in this exact shape: {"suggestions":[{"label":"short chip","text":"full reply"}]}
Keep labels ≤5 words, text ≤20 words. Reply in the same language as the question.`;

const resolveActiveProvider = async (): Promise<ProviderConfig | null> => {
  const store = await loadProviderSettings();
  const enabled = store.providers.filter((p) => p.enabled && p.apiKey.length > 0);
  if (enabled.length === 0) return null;

  const activeId = await getStorageItem<string>("ai.chat.activeProviderId");
  const active = activeId ? enabled.find((p) => p.providerId === activeId) : undefined;
  return active ?? enabled[0];
};

const callOpenAi = async (config: ProviderConfig, question: string): Promise<string> => {
  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true,
  });
  const completion = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });
  return completion.choices?.[0]?.message?.content ?? "";
};

const callGemini = async (config: ProviderConfig, question: string): Promise<string> => {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });
  const result = await model.generateContent(question);
  return result.response.text();
};

const stripFences = (raw: string): string => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
};

const parseSuggestions = (raw: string): AnswerSuggestion[] => {
  if (!raw) return [];
  const cleaned = stripFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objectMatch) return [];
    try {
      parsed = JSON.parse(objectMatch[0]);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== "object") return [];
  const suggestions = (parsed as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) return [];

  const out: AnswerSuggestion[] = [];
  for (const item of suggestions) {
    if (!item || typeof item !== "object") continue;
    const label = (item as { label?: unknown }).label;
    const text = (item as { text?: unknown }).text;
    if (typeof label !== "string" || typeof text !== "string") continue;
    const trimmedLabel = label.trim();
    const trimmedText = text.trim();
    if (!trimmedLabel || !trimmedText) continue;
    out.push({ label: trimmedLabel, text: trimmedText });
    if (out.length >= 4) break;
  }
  return out;
};

export const generateAnswerSuggestions = async (
  question: string,
): Promise<AnswerSuggestion[]> => {
  try {
    if (!question || !question.trim()) return [];
    const config = await resolveActiveProvider();
    if (!config) return [];

    let raw: string;
    if (config.providerId === "gemini") {
      raw = await callGemini(config, question);
    } else if (config.providerId === "openai") {
      raw = await callOpenAi(config, question);
    } else {
      return [];
    }

    return parseSuggestions(raw);
  } catch (e: unknown) {
    console.warn("[answer-suggester] failed:", e instanceof Error ? e.message : String(e));
    return [];
  }
};
