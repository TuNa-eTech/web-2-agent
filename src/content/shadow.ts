// ---------------------------------------------------------------------------
// Shadow DOM utilities — create isolated host for toolbar UI
// ---------------------------------------------------------------------------

const SHADOW_HOST_ID = "mcp-toolbar-shadow-host";

/**
 * Create (or return existing) Shadow DOM host element.
 * The host is an inline-block div so it flows naturally in the button row.
 */
export const getOrCreateShadowHost = (): {
  host: HTMLElement;
  shadow: ShadowRoot;
  isNew: boolean;
} => {
  const existing = document.getElementById(SHADOW_HOST_ID);
  if (existing && existing.shadowRoot) {
    return { host: existing, shadow: existing.shadowRoot, isNew: false };
  }

  const host = document.createElement("div");
  host.id = SHADOW_HOST_ID;
  host.style.display = "inline-flex";
  host.style.alignItems = "center";
  host.style.verticalAlign = "middle";
  host.style.margin = "0 2px";

  const shadow = host.attachShadow({ mode: "open" });
  return { host, shadow, isNew: true };
};

/**
 * Inject a CSS string into the shadow root.
 * Uses Constructable Stylesheets when available for better perf.
 */
export const injectCSS = async (shadow: ShadowRoot, css: string): Promise<void> => {
  try {
    const sheet = new CSSStyleSheet();
    await sheet.replace(css);
    shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
  } catch {
    // Fallback for environments that don't support constructable stylesheets
    const style = document.createElement("style");
    style.textContent = css;
    shadow.appendChild(style);
  }
};

/**
 * Load a CSS file from the extension bundle and inject into shadow root.
 */
export const injectCSSFromBundle = async (
  shadow: ShadowRoot,
  path: string,
): Promise<void> => {
  const url = chrome.runtime.getURL(path);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[shadow] Failed to fetch CSS: ${url} (${res.status})`);
    return;
  }
  const css = await res.text();
  await injectCSS(shadow, css);
};

/** Remove the shadow host from DOM entirely. */
export const removeShadowHost = (): void => {
  document.getElementById(SHADOW_HOST_ID)?.remove();
};
