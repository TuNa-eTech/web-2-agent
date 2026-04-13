// ---------------------------------------------------------------------------
// Platform detection + adapter factory
// ---------------------------------------------------------------------------

import type { Platform, PlatformAdapter } from "./types";
import { createGeminiAdapter } from "./gemini";
import { createChatGPTAdapter } from "./chatgpt";

export type { Platform, PlatformAdapter } from "./types";

const PLATFORM_PATTERNS: readonly { pattern: RegExp; platform: Platform }[] = [
  { pattern: /gemini\.google\.com/i, platform: "gemini" },
  { pattern: /chat\.openai\.com/i, platform: "chatgpt" },
  { pattern: /chatgpt\.com/i, platform: "chatgpt" },
];

/** Detect which platform the current page belongs to, or null. */
export const detectPlatform = (): Platform | null => {
  const hostname = location.hostname;
  for (const { pattern, platform } of PLATFORM_PATTERNS) {
    if (pattern.test(hostname)) return platform;
  }
  return null;
};

/** Create the appropriate adapter for the detected platform. */
export const createAdapter = (platform: Platform): PlatformAdapter => {
  switch (platform) {
    case "gemini":
      return createGeminiAdapter();
    case "chatgpt":
      return createChatGPTAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};
