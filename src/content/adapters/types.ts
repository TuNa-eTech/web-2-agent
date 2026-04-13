// ---------------------------------------------------------------------------
// Platform adapter interface — each supported AI chat site implements this
// ---------------------------------------------------------------------------

export type Platform = "gemini" | "chatgpt";

export interface PlatformAdapter {
  /** Which platform this adapter targets */
  readonly platform: Platform;

  /**
   * Wait until the page DOM is ready for toolbar injection.
   * Polls for the insertion point up to `maxAttempts` times.
   */
  waitForReady(maxAttempts?: number): Promise<void>;

  /**
   * Find the DOM element where the toolbar should be injected.
   * Returns null if the insertion point cannot be found.
   */
  findInsertionPoint(): HTMLElement | null;

  /**
   * Insert text into the chat input field, as if the user typed it.
   */
  insertText(text: string): void;

  /**
   * Return the chat input element (contenteditable div or textarea).
   */
  getInputElement(): HTMLElement | null;
}
