// ---------------------------------------------------------------------------
// Gemini adapter — CSS selectors and text insertion for gemini.google.com
// ---------------------------------------------------------------------------

import type { PlatformAdapter } from "./types";

// Gemini's DOM structure changes frequently; maintain multiple fallbacks.
const SELECTORS = {
  // Chat input — Gemini uses Quill editor (contenteditable)
  input: [
    "div.ql-editor.textarea",
    "div.ql-editor",
    'div[contenteditable="true"].textarea',
    'div[contenteditable="true"]',
  ],
  // Container near the send button where we append our toolbar
  insertionContainer: [
    ".leading-actions-wrapper",
    ".input-area-container .leading-actions",
    ".input-area .actions",
    ".chat-input-area .action-wrapper",
  ],
} as const;

/** Try each selector in order until one matches. */
const queryFirst = (selectors: readonly string[]): HTMLElement | null => {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
};

export const createGeminiAdapter = (): PlatformAdapter => ({
  platform: "gemini",

  async waitForReady(maxAttempts = 15): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (this.findInsertionPoint()) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error(`[Gemini] Insertion point not found after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, 500);
        }
      };
      setTimeout(check, 300);
    });
  },

  findInsertionPoint(): HTMLElement | null {
    return queryFirst(SELECTORS.insertionContainer);
  },

  getInputElement(): HTMLElement | null {
    return queryFirst(SELECTORS.input);
  },

  insertText(text: string): void {
    const input = this.getInputElement();
    if (!input) {
      console.warn("[Gemini] Could not find input element for text insertion");
      return;
    }

    // Gemini uses Quill / contenteditable — set innerHTML then dispatch input
    // Find or create a <p> inside the editor
    let p = input.querySelector("p");
    if (!p) {
      p = document.createElement("p");
      input.appendChild(p);
    }

    // Append text (don't overwrite existing content)
    const existing = p.textContent ?? "";
    p.textContent = existing ? `${existing}\n${text}` : text;

    // Fire events so Quill/framework picks up the change
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    // Focus the input
    input.focus();
  },
});
