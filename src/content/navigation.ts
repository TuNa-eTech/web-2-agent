// ---------------------------------------------------------------------------
// SPA navigation watcher — detects URL changes and re-injects toolbar
// ---------------------------------------------------------------------------

export type ReinjectFn = () => void;

/**
 * Watches for SPA-style navigations (pushState / replaceState / popstate)
 * and DOM mutations that remove our toolbar. Calls `reinject` when needed.
 *
 * @returns cleanup function to stop watching
 */
export const createNavigationWatcher = (
  toolbarHostId: string,
  reinject: ReinjectFn,
): (() => void) => {
  let lastUrl = location.href;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const debouncedReinject = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Only reinject if toolbar is actually missing
      if (!document.getElementById(toolbarHostId)) {
        reinject();
      }
    }, 600);
  };

  // 1. MutationObserver — detect when our host element is removed
  const observer = new MutationObserver(() => {
    // URL changed (SPA navigation)
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      debouncedReinject();
      return;
    }

    // Host removed from DOM
    if (!document.getElementById(toolbarHostId)) {
      debouncedReinject();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 2. popstate — browser back/forward
  const onPopState = () => {
    lastUrl = location.href;
    debouncedReinject();
  };
  window.addEventListener("popstate", onPopState);

  // Cleanup
  return () => {
    observer.disconnect();
    window.removeEventListener("popstate", onPopState);
    if (debounceTimer) clearTimeout(debounceTimer);
  };
};
