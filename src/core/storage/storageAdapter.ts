const hasChromeStorage = (): boolean =>
  typeof globalThis !== "undefined" &&
  typeof globalThis.chrome !== "undefined" &&
  !!globalThis.chrome?.storage?.local;

const chromeGet = (key: string): Promise<unknown> =>
  new Promise((resolve) => {
    globalThis.chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });

const chromeSet = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve) => {
    globalThis.chrome.storage.local.set(items, () => resolve());
  });

const chromeRemove = (keys: string[]): Promise<void> =>
  new Promise((resolve) => {
    globalThis.chrome.storage.local.remove(keys, () => resolve());
  });

const localGet = (key: string): unknown => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const localSet = (items: Record<string, unknown>) => {
  if (typeof localStorage === "undefined") return;
  for (const [key, value] of Object.entries(items)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const localRemove = (keys: string[]) => {
  if (typeof localStorage === "undefined") return;
  for (const key of keys) {
    localStorage.removeItem(key);
  }
};

export const getStorageItem = async <T = unknown>(key: string): Promise<T | null> => {
  if (hasChromeStorage()) {
    return (await chromeGet(key)) as T | null;
  }
  return (localGet(key) as T | null) ?? null;
};

export const setStorageItem = async (key: string, value: unknown): Promise<void> => {
  if (hasChromeStorage()) {
    await chromeSet({ [key]: value });
    return;
  }
  localSet({ [key]: value });
};

export const setStorageItems = async (items: Record<string, unknown>): Promise<void> => {
  if (hasChromeStorage()) {
    await chromeSet(items);
    return;
  }
  localSet(items);
};

export const removeStorageItems = async (keys: string[]): Promise<void> => {
  if (hasChromeStorage()) {
    await chromeRemove(keys);
    return;
  }
  localRemove(keys);
};
