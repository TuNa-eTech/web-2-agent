import { useCallback, useEffect, useState } from "react";
import type {
  AiProviderId,
  ProviderConfig,
  ProviderSettingsStore,
} from "../types";
import {
  loadProviderSettings,
  saveProviderSettings,
  getDefaultModel,
} from "../../core/storage/providerStorage";
import { getProviderRegistry } from "../lib/providerRegistry";

type ProviderSettingsState = {
  loading: boolean;
  saving: boolean;
  store: ProviderSettingsStore;
};

export const useProviderSettings = () => {
  const [state, setState] = useState<ProviderSettingsState>({
    loading: true,
    saving: false,
    store: { version: 1, providers: [] },
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const store = await loadProviderSettings();
    setState({ loading: false, saving: false, store });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getConfigFor = (providerId: AiProviderId): ProviderConfig => {
    const existing = state.store.providers.find((p) => p.providerId === providerId);
    if (existing) return existing;
    return {
      providerId,
      apiKey: "",
      model: getDefaultModel(providerId),
      enabled: false,
    };
  };

  const saveProvider = async (config: ProviderConfig) => {
    setState((prev) => ({ ...prev, saving: true }));
    const store = { ...state.store };
    const idx = store.providers.findIndex((p) => p.providerId === config.providerId);
    if (idx >= 0) {
      store.providers = [...store.providers];
      store.providers[idx] = config;
    } else {
      store.providers = [...store.providers, config];
    }
    await saveProviderSettings(store);
    setState({ loading: false, saving: false, store });
  };

  return {
    loading: state.loading,
    saving: state.saving,
    store: state.store,
    registry: getProviderRegistry(),
    getConfigFor,
    saveProvider,
    reload,
  };
};
