import { ChangeEvent } from "react";
import { LoaderCircle, RefreshCw, Rocket, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RawJsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onTestConnections: () => void;
  onReload: () => void;
  loading: boolean;
  saving: boolean;
  testing: boolean;
};

export const RawJsonEditor = ({
  value,
  onChange,
  onSave,
  onTestConnections,
  onReload,
  loading,
  saving,
  testing,
}: RawJsonEditorProps) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <section className="flex h-full flex-col gap-4">
      <div className="feature-glow rounded-[28px] border border-white/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold tracking-[0.01em] text-primary">
              Config studio
            </div>
            <div>
              <h2 className="text-foreground text-2xl font-semibold">Raw MCP Config</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
                Paste or edit the full `mcpServers` document. Secrets stay encrypted in storage,
                while the preview pane stays redacted.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={loading || saving || testing}
              onClick={onReload}
              type="button"
              variant="outline"
            >
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Reload
            </Button>
            <Button
              disabled={loading || saving || testing}
              onClick={onTestConnections}
              type="button"
              variant="secondary"
            >
              {testing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Rocket className="size-4" />
              )}
              {testing ? "Testing..." : "Test Connections"}
            </Button>
            <Button disabled={loading || saving || testing} onClick={onSave} type="button">
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? "Saving..." : "Save Config"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-semibold tracking-[0.01em]" htmlFor="raw-json-editor">
          mcpServers.json
        </Label>
        <div className="status-pill">
          <span>{value.length.toLocaleString()} chars</span>
        </div>
      </div>

      <div className="app-surface rounded-[30px] bg-white/88 p-3">
        <Textarea
          className="min-h-[560px] resize-y border-0 bg-white/70 px-5 py-5 font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0"
          disabled={loading}
          id="raw-json-editor"
          onChange={handleChange}
          spellCheck={false}
          value={value}
        />
      </div>
    </section>
  );
};
