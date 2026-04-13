// ---------------------------------------------------------------------------
// Shadow DOM utilities — create isolated host for toolbar UI
// ---------------------------------------------------------------------------

const SHADOW_HOST_ID = "mcp-toolbar-shadow-host";

/**
 * Create (or return existing) Shadow DOM host element.
 * Default styles are overridden in index.tsx after creation
 * to match the platform's layout (block row above the composer).
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
  // Base styles — overridden per-platform in index.tsx
  host.style.display = "flex";
  host.style.alignItems = "center";
  host.style.width = "100%";
  host.style.boxSizing = "border-box";

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
