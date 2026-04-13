// ---------------------------------------------------------------------------
// ChatGPT adapter — CSS selectors and text insertion for chatgpt.com
// ---------------------------------------------------------------------------

import type { PlatformAdapter } from "./types";

const SELECTORS = {
  // ChatGPT uses a ProseMirror or plain <textarea>
  input: [
    "#prompt-textarea",
    '.ProseMirror[contenteditable="true"]',
    'textarea[data-id="root"]',
    "textarea",
  ],
  // Container near the send/attach buttons
  insertionContainer: [
    // ChatGPT's composer bottom toolbar
    ".flex.items-end.gap-1\\.5",
    ".flex.items-end",
    ".composer-actions",
    // Fallback: the parent of the send button
    'button[data-testid="send-button"]',
  ],
} as const;

const queryFirst = (selectors: readonly string[]): HTMLElement | null => {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
};

/**
 * For send-button fallback: return its parent container instead
 * so we can inject siblings next to it.
 */
const findContainer = (): HTMLElement | null => {
  for (const sel of SELECTORS.insertionContainer) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    // If we matched a button, use its parent
    if (el.tagName === "BUTTON" && el.parentElement) {
      return el.parentElement;
    }
    return el;
  }
  return null;
};

export const createChatGPTAdapter = (): PlatformAdapter => ({
  platform: "chatgpt",

  async waitForReady(maxAttempts = 15): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (this.findInsertionPoint()) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error(`[ChatGPT] Insertion point not found after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, 500);
        }
      };
      setTimeout(check, 300);
    });
  },

  findInsertionPoint(): HTMLElement | null {
    return findContainer();
  },

  getInputElement(): HTMLElement | null {
    return queryFirst(SELECTORS.input);
  },

  insertText(text: string): void {
    const input = this.getInputElement();
    if (!input) {
      console.warn("[ChatGPT] Could not find input element for text insertion");
      return;
    }

    if (input instanceof HTMLTextAreaElement) {
      // Standard textarea — use native setter for React-controlled inputs
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      const existing = input.value;
      const newVal = existing ? `${existing}\n${text}` : text;
      nativeSetter?.call(input, newVal);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // ProseMirror contenteditable
      const existing = input.textContent ?? "";
      const p = document.createElement("p");
      p.textContent = existing ? `${existing}\n${text}` : text;
      input.innerHTML = "";
      input.appendChild(p);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    input.focus();
  },
});
