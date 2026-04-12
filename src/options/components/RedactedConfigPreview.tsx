import { EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type RedactedConfigPreviewProps = {
  preview: string | null;
};

export const RedactedConfigPreview = ({ preview }: RedactedConfigPreviewProps) => {
  return (
    <section className="flex h-full flex-col gap-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-foreground text-lg font-semibold">Redacted Preview</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Sensitive headers and env values stay masked outside the editor.
            </p>
          </div>
          <Badge variant="outline">Read only</Badge>
        </div>
      </header>

      <div className="code-panel flex h-[540px] min-h-0 flex-col overflow-hidden rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.02em] text-muted-foreground uppercase">
            <EyeOff className="size-3.5" />
            Protected output
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <pre className="m-0 p-3 text-xs leading-6 whitespace-pre-wrap break-words">
            {preview ?? "Preview becomes available once the JSON document validates successfully."}
          </pre>
        </ScrollArea>
      </div>
    </section>
  );
};
