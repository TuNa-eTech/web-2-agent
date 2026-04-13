// ---------------------------------------------------------------------------
// Gemini adapter — CSS selectors and text insertion for gemini.google.com
// ---------------------------------------------------------------------------

import type { PlatformAdapter } from "./types";
import { delay } from "../utils";

// Gemini's DOM structure changes frequently; maintain multiple fallbacks.
const SELECTORS = {
  // Chat input — Gemini uses Quill editor (contenteditable)
  input: [
    "div.ql-editor.textarea",
    "div.ql-editor",
    'div[contenteditable="true"].textarea',
    'div[contenteditable="true"]',
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

/**
 * Find the outer composer container for Gemini.
 * Walk up from the input element to find the enclosing form or
 * top-level input area div — we insert the toolbar as a sibling BEFORE it.
 */
const findComposerContainer = (): HTMLElement | null => {
  const input = queryFirst([
    "div.ql-editor.textarea",
    "div.ql-editor",
    'div[contenteditable="true"].textarea',
    'div[contenteditable="true"]',
  ]);
  if (input) {
    // Walk up to find <form> first
    let el: HTMLElement | null = input;
    while (el && el !== document.body) {
      if (el.tagName === "FORM") return el;
      el = el.parentElement;
    }
    // Fallback: known Gemini container classes
    const known = document.querySelector<HTMLElement>(
      ".input-area-container, .chat-input-box, rich-textarea"
    );
    if (known) return known;
    // Last resort: grandparent of the input
    return input.parentElement?.parentElement ?? input.parentElement ?? null;
  }
  return document.querySelector<HTMLElement>("form");
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
    return findComposerContainer();
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

    // Focus the input first so execCommand targets the right element
    input.focus();

    // Move cursor to the end of existing content
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false); // collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Prepend newline if there's already content
    const existing = input.textContent?.trim() ?? "";
    const insertValue = existing ? `\n${text}` : text;

    // Use InputEvent with insertText — this is the standard way to programmatically
    // insert text into contenteditable elements and is recognized by Quill/frameworks.
    // Unlike setting textContent directly, this goes through the browser's input handling
    // pipeline which frameworks hook into.
    const inputEvent = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: insertValue,
    });
    const accepted = input.dispatchEvent(inputEvent);

    // Fallback: if beforeinput was not handled (cancelled or no listener),
    // try document.execCommand which also triggers Quill's mutation observer
    if (!accepted || input.textContent?.trim() === existing) {
      document.execCommand("insertText", false, insertValue);
    }

    // Dispatch input event to ensure any remaining listeners pick up the change
    input.dispatchEvent(new Event("input", { bubbles: true }));
  },

  async injectFile(content: string, filename: string): Promise<boolean> {
    const file = new File([content], filename, { type: "text/plain" });
    const dt = new DataTransfer();
    dt.items.add(file);

    // ---------------------------------------------------------------------------
    // Strategy 1: Click the "+" upload button to expose the hidden file input.
    // ---------------------------------------------------------------------------
    let plusBtn = document.querySelector<HTMLElement>(
      "button.upload-card-button, " +
      "button[aria-label*='Upload'], " +
      "button[aria-label*='upload'], " +
      "button[data-tooltip*='Upload'], " +
      "button[aria-label*='tệp'], " + // Vietnamese fallback
      "button[data-tooltip*='tệp'], " +
      "[data-test-id='upload-button'], " +
      "[data-test-id='uploader-button'], " +
      ".upload-button",
    );

    // Some versions of Gemini use a generic icon button for attach
    if (!plusBtn) {
      const icons = Array.from(document.querySelectorAll("mat-icon, .google-symbols"));
      const attachIcon = icons.find(i => i.textContent?.includes("add_circle") || i.textContent?.includes("attach_file"));
      if (attachIcon) {
         plusBtn = attachIcon.closest("button");
      }
    }

    if (plusBtn) {
      plusBtn.click();
      await delay(300); // Wait for menu to open
    }

    // Now try to find the actual "Upload file" menu item 
    // Usually it has data-test-id="local-images-files-uploader-button"
    const localUploadMenuItem = document.querySelector<HTMLElement>(
      "[data-test-id='local-images-files-uploader-button']"
    );
    if (localUploadMenuItem) {
      // Sometimes clicking this directly triggers the file dialog, but may also inject the input file
      // We don't click it because that triggers native file picker which blocks the thread.
      // We just need the input[type=file] to be present. It should be in the DOM now.
    }

    // ---------------------------------------------------------------------------
    // Strategy 2: Find the hidden input[type="file"] and inject the file directly.
    // ---------------------------------------------------------------------------
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput) {
      const dtLocal = new DataTransfer();
      dtLocal.items.add(file);
      fileInput.files = dtLocal.files;
      
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));

      await delay(500);

      const accepted = !!(
        document.querySelector(".attachment-chip") ??
        document.querySelector("[data-test-id='file-attachment']") ??
        document.querySelector(".file-preview") ??
        document.querySelector("[aria-label*='attachment']") ??
        document.querySelector(".upload-card")
      );
      if (accepted) return true;
    }

    // ---------------------------------------------------------------------------
    // Strategy 3: Synthetic Paste Event
    // Many modern editors (including Quill used by Gemini) handle file attachments
    // when users paste files. We can simulate a paste event containing our file.
    // ---------------------------------------------------------------------------
    const editor = document.querySelector<HTMLElement>("rich-textarea") ?? 
                  document.querySelector<HTMLElement>(".ql-editor");
    
    if (editor) {
      const dtPaste = new DataTransfer();
      dtPaste.items.add(file);
      
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dtPaste,
        bubbles: true,
        cancelable: true
      });
      
      editor.focus();
      editor.dispatchEvent(pasteEvent);
      await delay(400);

      const accepted = !!(
        document.querySelector(".attachment-chip") ??
        document.querySelector("[data-test-id='file-attachment']") ??
        document.querySelector(".file-preview") ??
        document.querySelector("[aria-label*='attachment']") ??
        document.querySelector(".upload-card")
      );
      if (accepted) return true;
    }

    // ---------------------------------------------------------------------------
    // Strategy 4: Fallback — simulate drag-and-drop on Gemini's input area.
    // ---------------------------------------------------------------------------
    const dropZone: HTMLElement | null =
      document.querySelector("rich-textarea") ??
      document.querySelector(".input-area-container") ??
      (document
        .querySelector(".leading-actions-wrapper")
        ?.closest("form") as HTMLElement | null) ??
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
        document.querySelector(".attachment-chip") ??
        document.querySelector("[data-test-id='file-attachment']") ??
        document.querySelector(".file-preview") ??
        document.querySelector("[aria-label*='attachment']") ??
        document.querySelector(".upload-card")
      );
      if (accepted) return true;
    }

    return false;
  },
});
