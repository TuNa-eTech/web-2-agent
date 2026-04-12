import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AiProviderId, ProviderConfig, ProviderMeta } from "../../shared/types";
import { useProviderSettings } from "../../shared/hooks/useProviderSettings";
import {
  fetchModelsForProvider,
  type ModelInfo,
} from "../../core/ai/model-fetcher";

// ---------------------------------------------------------------------------
// Model fetching hook — per-provider
// ---------------------------------------------------------------------------

type ModelListState = {
  status: "idle" | "loading" | "loaded" | "error";
  models: ModelInfo[];
  error: string | null;
};

const useModelList = (providerId: AiProviderId) => {
  const [state, setState] = React.useState<ModelListState>({
    status: "idle",
    models: [],
    error: null,
  });

  const fetch = React.useCallback(
    async (apiKey: string, baseUrl?: string) => {
      if (!apiKey) return;
      setState({ status: "loading", models: [], error: null });
      const result = await fetchModelsForProvider(providerId, apiKey, baseUrl);
      if (result.ok) {
        setState({ status: "loaded", models: result.models, error: null });
      } else {
        setState({ status: "error", models: [], error: result.error });
      }
    },
    [providerId],
  );

  return { ...state, fetchModels: fetch };
};

// ---------------------------------------------------------------------------
// ProviderCard
// ---------------------------------------------------------------------------

const ProviderCard = ({
  meta,
  config,
  saving,
  onSave,
}: {
  meta: ProviderMeta;
  config: ProviderConfig;
  saving: boolean;
  onSave: (config: ProviderConfig) => void;
}) => {
  const [draft, setDraft] = React.useState(config);
  const [showKey, setShowKey] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const { status, models, error, fetchModels } = useModelList(meta.id);

  // Sync draft when stored config changes (e.g. after save round-trip)
  React.useEffect(() => {
    setDraft(config);
    setDirty(false);
  }, [config]);

  // Auto-fetch models when card mounts if we already have a key
  React.useEffect(() => {
    if (config.apiKey) {
      void fetchModels(config.apiKey, config.baseUrl);
    }
  }, [config.apiKey, config.baseUrl, fetchModels]);

  const update = (patch: Partial<ProviderConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(draft);
    setDirty(false);
    // Re-fetch models with the new key
    if (draft.apiKey) {
      void fetchModels(draft.apiKey, draft.baseUrl);
    }
  };

  const hasKey = draft.apiKey.length > 0;
  const modelsLoaded = status === "loaded" && models.length > 0;

  return (
    <div className="rounded-xl border bg-background/50 p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="size-4 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{meta.displayName}</span>
            {hasKey && (
              <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/10" variant="secondary">
                Configured
              </Badge>
            )}
          </div>
          <a
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            href={meta.apiKeyHelpUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Get API key <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Fields */}
      <div className="mt-4 space-y-3">
        {/* API Key */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground" htmlFor={`${meta.id}-key`}>
            API Key
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                autoComplete="off"
                className="h-9 w-full rounded-lg border bg-muted/30 px-3 pr-9 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                id={`${meta.id}-key`}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder={meta.apiKeyPlaceholder}
                type={showKey ? "text" : "password"}
                value={draft.apiKey}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey((s) => !s)}
                tabIndex={-1}
                type="button"
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <Button
              disabled={!draft.apiKey || status === "loading"}
              onClick={() => void fetchModels(draft.apiKey, draft.baseUrl)}
              size="sm"
              variant="outline"
            >
              {status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Verify
            </Button>
          </div>
          {status === "loaded" && (
            <span className="text-xs text-success">Key valid — {models.length} models loaded.</span>
          )}
          {status === "error" && error && (
            <div className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Model — dynamic from API */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground" htmlFor={`${meta.id}-model`}>
              Model
            </Label>
            {status === "loading" && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Fetching models...
              </span>
            )}
            {modelsLoaded && (
              <button
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                onClick={() => {
                  const key = draft.apiKey || config.apiKey;
                  if (key) void fetchModels(key, draft.baseUrl || config.baseUrl);
                }}
                type="button"
              >
                <RefreshCw className="size-3" /> Refresh
              </button>
            )}
          </div>

          {modelsLoaded ? (
            <select
              className="h-9 w-full rounded-lg border bg-muted/30 px-3 text-xs outline-none transition-colors focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              id={`${meta.id}-model`}
              onChange={(e) => update({ model: e.target.value })}
              value={draft.model}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-9 items-center rounded-lg border bg-muted/15 px-3 text-xs text-muted-foreground">
              {status === "loading"
                ? "Loading..."
                : "Verify API key to load models"}
            </div>
          )}
        </div>

        {/* Base URL (optional) */}
        {meta.supportsBaseUrl && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor={`${meta.id}-url`}>
              Base URL
              <span className="ml-1 text-muted-foreground/60">(optional)</span>
            </Label>
            <input
              className="h-9 w-full rounded-lg border bg-muted/30 px-3 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
              id={`${meta.id}-url`}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder={meta.defaultBaseUrl ?? "https://..."}
              value={draft.baseUrl ?? ""}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            checked={draft.enabled}
            className="accent-primary"
            onChange={(e) => update({ enabled: e.target.checked })}
            type="checkbox"
          />
          Enabled
        </label>

        <Button
          disabled={!dirty || saving}
          onClick={handleSave}
          size="sm"
          variant={dirty ? "default" : "outline"}
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
          Save
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export const ProviderSettingsPanel = () => {
  const {
    loading,
    saving,
    registry,
    getConfigFor,
    saveProvider,
  } = useProviderSettings();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading provider settings...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold">AI Providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure API keys and models for AI inference. Models are loaded directly from the provider after saving a valid key.
        </p>
      </div>

      <div className="grid gap-4">
        {registry.map((meta) => (
          <ProviderCard
            config={getConfigFor(meta.id)}
            key={meta.id}
            meta={meta}
            onSave={saveProvider}
            saving={saving}
          />
        ))}
      </div>
    </div>
  );
};
