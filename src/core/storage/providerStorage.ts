import type {
  AiProviderId,
  ProviderConfig,
  ProviderSettingsStore,
} from "../../shared/types";
import { getProviderMeta } from "../../shared/lib/providerRegistry";
import { encryptString, decryptString } from "./crypto";
import { getStorageItem, setStorageItem } from "./storageAdapter";
import { STORAGE_KEYS } from "./storageKeys";

const EMPTY_STORE: ProviderSettingsStore = {
  version: 1,
  providers: [],
};

export const loadProviderSettings = async (): Promise<ProviderSettingsStore> => {
  const stored = await getStorageItem<{
    version: number;
    cipherText: string;
    iv: string;
    salt: string;
  }>(STORAGE_KEYS.providerSettings);

  if (!stored) return { ...EMPTY_STORE };

  try {
    const json = await decryptString(stored);
    const parsed: unknown = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      (parsed as ProviderSettingsStore).version === 1
    ) {
      return parsed as ProviderSettingsStore;
    }
    return { ...EMPTY_STORE };
  } catch {
    return { ...EMPTY_STORE };
  }
};

export const saveProviderSettings = async (
  store: ProviderSettingsStore,
): Promise<void> => {
  const json = JSON.stringify(store);
  const encrypted = await encryptString(json);
  await setStorageItem(STORAGE_KEYS.providerSettings, encrypted);
};

export const upsertProviderConfig = async (
  config: ProviderConfig,
): Promise<ProviderSettingsStore> => {
  const store = await loadProviderSettings();
  const idx = store.providers.findIndex((p) => p.providerId === config.providerId);
  if (idx >= 0) {
    store.providers[idx] = config;
  } else {
    store.providers.push(config);
  }
  await saveProviderSettings(store);
  return store;
};

/** Return all providers that have a key and are enabled. */
export const getEnabledProviders = async (): Promise<ProviderConfig[]> => {
  const store = await loadProviderSettings();
  return store.providers.filter((p) => p.enabled && p.apiKey.length > 0);
};

export const getDefaultModel = (providerId: AiProviderId): string => {
  const meta = getProviderMeta(providerId);
  return meta?.defaultModelId ?? "";
};
