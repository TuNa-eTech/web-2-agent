// ---------------------------------------------------------------------------
// ChatGPT adapter — CSS selectors and text insertion for chatgpt.com
// ---------------------------------------------------------------------------

import type { PlatformAdapter } from "./types";
import { delay } from "../utils";

const SELECTORS = {
  // ChatGPT uses a ProseMirror or plain <textarea>
  input: [
    "#prompt-textarea",
    '.ProseMirror[contenteditable="true"]',
    'textarea[data-id="root"]',
    "textarea",
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
 * Find the outer composer form element.
 * We insert the toolbar as a sibling BEFORE this element (above the input box).
 */
const findComposerForm = (): HTMLElement | null => {
  // Prefer the form that wraps the chat input
  const textarea = queryFirst([
    "#prompt-textarea",
    '.ProseMirror[contenteditable="true"]',
    "textarea",
  ]);
  if (textarea) {
    // Walk up to find the enclosing <form>
    let el: HTMLElement | null = textarea;
    while (el && el !== document.body) {
      if (el.tagName === "FORM") return el;
      el = el.parentElement;
    }
    // Fallback: return the textarea's grandparent container
    return textarea.parentElement?.parentElement ?? textarea.parentElement ?? null;
  }
  // Last resort: any form on the page
  return document.querySelector<HTMLElement>("form");
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
    return findComposerForm();
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

  async injectFile(content: string, filename: string): Promise<boolean> {
    const file = new File([content], filename, { type: "text/plain" });
    const dt = new DataTransfer();
    dt.items.add(file);

    const textarea = document.querySelector<HTMLElement>("#prompt-textarea") ??
                     document.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]');

    // ---------------------------------------------------------------------------
    // Strategy 1: Synthetic Paste Event
    // ChatGPT's editor listens for paste events to attach files
    // ---------------------------------------------------------------------------
    if (textarea) {
      const dtPaste = new DataTransfer();
      dtPaste.items.add(file);
      
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dtPaste,
        bubbles: true,
        cancelable: true
      });
      
      textarea.focus();
      textarea.dispatchEvent(pasteEvent);
      await delay(400);

      const accepted = !!(
        document.querySelector('[data-testid*="file"]') ??
        document.querySelector(".upload-preview") ??
        document.querySelector('[class*="attachment"]') ??
        document.querySelector('[class*="file-upload"]')
      );
      if (accepted) return true;
    }

    // ---------------------------------------------------------------------------
    // Strategy 2: Fallback — Drag and Drop
    // ---------------------------------------------------------------------------
    const dropZone: HTMLElement | null =
      document.querySelector('[data-testid="composer-background"]') ??
      (textarea?.closest("form") as HTMLElement | null) ??
      document.querySelector("form");

    if (dropZone) {
      const opts: DragEventInit = { dataTransfer: dt, bubbles: true, cancelable: true };
      dropZone.dispatchEvent(new DragEvent("dragenter", opts));
      await delay(30);
      dropZone.dispatchEvent(new DragEvent("dragover", opts));
      await delay(30);
      dropZone.dispatchEvent(new DragEvent("drop", opts));

      await delay(400);

      const accepted = !!(
        document.querySelector('[data-testid*="file"]') ??
        document.querySelector(".upload-preview") ??
        document.querySelector('[class*="attachment"]') ??
        document.querySelector('[class*="file-upload"]')
      );
      if (accepted) return true;
    }

    return false;
  },
});
