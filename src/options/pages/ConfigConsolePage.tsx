import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Info,
  Server,
  Settings,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfigConsole } from "../../shared/hooks/useConfigConsole";
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

  const [activeTab, setActiveTab] = React.useState<"editor" | "servers" | "preview">("editor");

  return (
    <main className="flex min-h-screen bg-muted/20">
      {/* Left Sidebar */}
      <aside className="flex w-[280px] flex-col border-r bg-background/50 backdrop-blur-sm">
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary p-2 text-primary-foreground shadow-sm">
              <Settings className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Settings</h1>
              <p className="text-xs text-muted-foreground">Config console</p>
            </div>
          </div>
        </div>
        
        <nav className="flex flex-col gap-1.5 p-4">
          <Button 
            className="h-10 justify-start font-medium" 
            onClick={() => setActiveTab("editor")}
            variant={activeTab === "editor" ? "secondary" : "ghost"} 
          >
            <FileJson className="mr-3 size-4" />
            MCP Configuration
          </Button>

          <Button 
            className="h-10 justify-start font-medium" 
            onClick={() => setActiveTab("servers")}
            variant={activeTab === "servers" ? "secondary" : "ghost"} 
          >
            <Server className="mr-3 size-4" />
            Connections
            {serverIndex.length > 0 && (
              <Badge className="ml-auto px-1.5 font-mono text-[10px]" variant="outline">{serverIndex.length}</Badge>
            )}
          </Button>

          <Button 
            className="h-10 justify-start font-medium" 
            onClick={() => setActiveTab("preview")}
            variant={activeTab === "preview" ? "secondary" : "ghost"} 
          >
            <Shield className="mr-3 size-4" />
            Security Preview
          </Button>
        </nav>

        <div className="mt-auto border-t px-6 py-5 text-xs text-muted-foreground">
          <div className="flex flex-col gap-2">
             <div className="flex items-center justify-between">
                <span>Core sync</span>
                {saving || testing || loading ? 
                   <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/10" variant="secondary">Syncing</Badge> : 
                   <Badge className="border-0 bg-success/15 text-success hover:bg-success/15" variant="secondary">Ready</Badge>}
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-8 py-8">
          
          {(errors.length > 0 || runtimeNotice) && (
            <div className="flex shrink-0 flex-col gap-4">
               <ErrorBanner errors={errors} />
               <NoticeBanner notice={runtimeNotice} />
            </div>
          )}

          <div className="flex-1 min-h-0 bg-background rounded-xl">
             {activeTab === "editor" && (
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
             )}
             {activeTab === "servers" && (
                <div className="flex h-full flex-col gap-4">
                  <div className="border-b pb-4">
                     <h2 className="text-lg font-semibold">Server Connections</h2>
                     <p className="mt-1 text-sm text-muted-foreground">Monitor health state and available tool catalogs across all configured targets.</p>
                  </div>
                  <ServerSummaryList
                    healthMap={healthMap}
                    serverIndex={serverIndex}
                    toolCatalog={toolCatalog}
                  />
                </div>
             )}
             {activeTab === "preview" && (
                <div className="flex h-full flex-col gap-4">
                   <div className="border-b pb-4">
                     <h2 className="text-lg font-semibold">Security Preview</h2>
                     <p className="mt-1 text-sm text-muted-foreground">Verify what gets exposed to the inference engine (secrets are dynamically masked).</p>
                  </div>
                  <RedactedConfigPreview preview={redactedPreview} />
                </div>
             )}
          </div>
        </div>
      </div>
    </main>
  );
};
