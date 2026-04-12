import {
  AlertTriangle,
  CheckCircle2,
  Info,
  PlugZap,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfigConsole } from "../../shared/hooks/useConfigConsole";
import { isPlainObject } from "../../shared/lib/objectUtils";
import { formatLabel } from "../../shared/lib/uiPresentation";
import { RawJsonEditor } from "../components/RawJsonEditor";
import { RedactedConfigPreview } from "../components/RedactedConfigPreview";
import { ServerSummaryList } from "../components/ServerSummaryList";

const ErrorBanner = ({
  errors,
}: {
  errors: { code: string; message: string; serverId?: string; path?: string }[];
}) => {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/7 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 text-destructive" />
        <div className="space-y-2">
          <div className="text-sm font-semibold text-destructive">
            Validation errors
          </div>
          <div className="grid gap-2">
            {errors.map((error, index) => (
              <div className="text-sm text-destructive/90" key={`${error.code}-${index}`}>
                {error.message}
                {error.serverId ? ` (${error.serverId})` : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const NoticeBanner = ({
  notice,
}: {
  notice: {
    tone: "neutral" | "success" | "error";
    message: string;
  } | null;
}) => {
  if (!notice) return null;

  const tone =
    notice.tone === "success"
      ? {
          icon: <CheckCircle2 className="mt-0.5 size-5 text-success" />,
          className: "border-success/20 bg-success/10 text-success",
          title: "Runtime update",
        }
      : notice.tone === "error"
        ? {
            icon: <AlertTriangle className="mt-0.5 size-5 text-destructive" />,
            className: "border-destructive/20 bg-destructive/7 text-destructive",
            title: "Runtime error",
          }
        : {
            icon: <Info className="mt-0.5 size-5 text-primary" />,
            className: "border-primary/15 bg-primary/8 text-foreground",
            title: "Runtime notice",
          };

  return (
    <div className={`rounded-xl border p-4 ${tone.className}`}>
      <div className="flex items-start gap-3">
        {tone.icon}
        <div>
          <div className="text-sm font-semibold">{tone.title}</div>
          <div className="mt-1 text-sm opacity-90">{notice.message}</div>
        </div>
      </div>
    </div>
  );
};

export const ConfigConsolePage = () => {
  const {
    loading,
    saving,
    testing,
    rawJson,
    serverIndex,
    healthMap,
    toolCatalog,
    errors,
    redactedPreview,
    runtimeNotice,
    updateRawJson,
    save,
    testConnections,
    reload,
  } = useConfigConsole();

  const normalizedServers = serverIndex.filter((entry) => isPlainObject(entry));
  const totalServers = normalizedServers.length;
  const totalTools = Object.values(toolCatalog).reduce(
    (sum, tools) => sum + (Array.isArray(tools) ? tools.length : 0),
    0,
  );
  const connectedServers = normalizedServers.filter((entry) => {
    const id = typeof entry.id === "string" ? entry.id : null;
    const health = id && isPlainObject(healthMap[id]) ? healthMap[id] : null;
    const state =
      health && typeof health.state === "string"
        ? health.state
        : typeof entry.status === "string"
          ? entry.status
          : "draft";

    return state === "connected";
  }).length;
  const issueCount = normalizedServers.filter((entry) => {
    const id = typeof entry.id === "string" ? entry.id : null;
    const health = id && isPlainObject(healthMap[id]) ? healthMap[id] : null;
    const state =
      health && typeof health.state === "string"
        ? health.state
        : typeof entry.status === "string"
          ? entry.status
          : "draft";

    return state === "failed" || state === "degraded";
  }).length;
  const presetSummary = Array.from(
    new Set(
      normalizedServers.flatMap((entry) => {
        const preset = typeof entry.preset === "string" ? entry.preset : null;
        return preset ? [preset] : [];
      }),
    ),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1540px] flex-col gap-5 px-4 py-5 lg:px-6 lg:py-6">
      <Card className="feature-glow rounded-xl border-white/70">
        <CardHeader className="gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge className="bg-white/72 text-primary" variant="secondary">
                MCP control plane
              </Badge>
              <div>
                <CardTitle className="text-3xl sm:text-4xl">
                  Config Console
                </CardTitle>
                <CardDescription className="mt-3 max-w-2xl text-base leading-7">
                  A safer workspace for editing MCP topology, testing live connectivity, and
                  reviewing what the extension will expose without decrypting secrets into the UI.
                </CardDescription>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-white/65 bg-white/74 p-3 shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <PlugZap className="size-4 text-primary" />
                  Connected
                </div>
                <div className="mt-2 text-3xl font-semibold">{connectedServers}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  of {totalServers} servers
                </div>
              </div>
              <div className="rounded-lg border border-white/65 bg-white/74 p-3 shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Workflow className="size-4 text-primary" />
                  Tools
                </div>
                <div className="mt-2 text-3xl font-semibold">{totalTools}</div>
                <div className="mt-1 text-xs text-muted-foreground">catalogued actions</div>
              </div>
              <div className="rounded-lg border border-white/65 bg-white/74 p-3 shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Shield className="size-4 text-primary" />
                  Protected
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {redactedPreview ? "Yes" : "Pending"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">preview redaction</div>
              </div>
              <div className="rounded-lg border border-white/65 bg-white/74 p-3 shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="size-4 text-primary" />
                  Presets
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {presetSummary.length || 0}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {presetSummary.length > 0
                    ? presetSummary.map((preset) => formatLabel(preset)).join(", ")
                    : "none detected"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="status-pill">{loading ? "Loading config..." : "Document loaded"}</div>
            <div className="status-pill">
              {saving ? "Persisting encrypted storage..." : "Storage synced"}
            </div>
            <div className="status-pill">
              {testing ? "Running connectivity checks..." : `${issueCount} health issues`}
            </div>
          </div>
        </CardHeader>
      </Card>

      <ErrorBanner errors={errors} />
      <NoticeBanner notice={runtimeNotice} />

      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_430px]">
        <RawJsonEditor
          loading={loading}
          onChange={updateRawJson}
          onReload={reload}
          onSave={save}
          onTestConnections={testConnections}
          saving={saving}
          testing={testing}
          value={rawJson}
        />

        <Card className="rounded-xl bg-white/86">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Operational sidebar</CardTitle>
                <CardDescription className="mt-1">
                  Flip between runtime inventory and a safe preview of the effective document.
                </CardDescription>
              </div>
              <Badge variant="outline">read-only views</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs className="flex flex-col" defaultValue="servers">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="servers">Servers</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="servers">
                <ServerSummaryList
                  healthMap={healthMap}
                  serverIndex={serverIndex}
                  toolCatalog={toolCatalog}
                />
              </TabsContent>
              <TabsContent value="preview">
                <RedactedConfigPreview preview={redactedPreview} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};
