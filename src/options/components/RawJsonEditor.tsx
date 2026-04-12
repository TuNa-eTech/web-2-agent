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
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Raw Configuration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit topology without exposing encrypted secrets to standard views.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={loading || saving || testing}
            onClick={onReload}
            size="sm"
            type="button"
            variant="outline"
          >
            {loading ? (
              <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-3.5" />
            )}
            Reload
          </Button>
          <Button
            disabled={loading || saving || testing}
            onClick={onTestConnections}
            size="sm"
            type="button"
            variant="secondary"
          >
            {testing ? (
              <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Rocket className="mr-1.5 size-3.5" />
            )}
            {testing ? "Testing..." : "Test Connections"}
          </Button>
          <Button disabled={loading || saving || testing} onClick={onSave} size="sm" type="button">
            {saving ? (
              <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            {saving ? "Saving..." : "Save Config"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-semibold tracking-[0.01em]" htmlFor="raw-json-editor">
          mcpServers.json
        </Label>
        <span className="text-xs text-muted-foreground">
          {value.length.toLocaleString()} chars
        </span>
      </div>

      <div className="flex-1 min-h-[500px] rounded-xl border bg-card p-2 shadow-sm">
        <Textarea
          className="h-full min-h-[500px] resize-none border-0 px-4 py-4 font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0"
          disabled={loading}
          id="raw-json-editor"
          onChange={handleChange}
          spellCheck={false}
          value={value}
        />
      </div>
    </div>
  );
};
