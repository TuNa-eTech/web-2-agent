import * as React from "react";
import { FileUp, Import, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { estimateTokens } from "../../core/skills/types";
import type { SkillContent, SkillReference } from "../../core/skills/types";

type ReferenceInput = { name: string; content: string };

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Parse YAML-like frontmatter (simple key: value pairs) */
const parseFrontmatter = (
  raw: string,
): { meta: Record<string, string>; body: string } | null => {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return null;

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key && value) meta[key] = value;
  }
  return { meta, body: match[2] };
};

type SkillEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: {
    name: string;
    description: string;
    content: SkillContent;
  };
  onSave: (data: {
    name: string;
    description: string;
    coreContent: string;
    references: Omit<SkillReference, "id" | "tokenEstimate">[];
  }) => void;
};

export const SkillEditor = ({
  open,
  onOpenChange,
  initial,
  onSave,
}: SkillEditorProps) => {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [coreContent, setCoreContent] = React.useState("");
  const [references, setReferences] = React.useState<ReferenceInput[]>([]);

  React.useEffect(() => {
    if (open && initial) {
      setName(initial.name);
      setDescription(initial.description);
      setCoreContent(initial.content.coreContent);
      setReferences(
        initial.content.references.map((r) => ({ name: r.name, content: r.content })),
      );
    } else if (open) {
      setName("");
      setDescription("");
      setCoreContent("");
      setReferences([]);
    }
  }, [open, initial]);

  const totalTokens =
    estimateTokens(coreContent) +
    references.reduce((sum, r) => sum + estimateTokens(r.content), 0);

  const handleImportSkill = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const raw = await file.text();
      const parsed = parseFrontmatter(raw);
      if (parsed) {
        if (parsed.meta.name) setName(parsed.meta.name);
        if (parsed.meta.description) setDescription(parsed.meta.description);
        setCoreContent(parsed.body.trimStart());
      } else {
        // No frontmatter — treat entire content as core content
        setCoreContent(raw);
        if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
      }
    };
    input.click();
  };

  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.txt,.json";
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files) return;
      const newRefs: ReferenceInput[] = [];
      for (const file of Array.from(input.files)) {
        const content = await file.text();
        newRefs.push({ name: file.name, content });
      }
      setReferences((prev) => [...prev, ...newRefs]);
    };
    input.click();
  };

  const removeReference = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim() || !coreContent.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      coreContent,
      references: references.map((r) => ({ name: r.name, content: r.content })),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>{initial ? "Edit Skill" : "New Skill"}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleImportSkill}
            >
              <Import className="size-3" />
              Import Skill
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Name & Description */}
          <div className="space-y-2">
            <Label htmlFor="skill-name">Name</Label>
            <input
              id="skill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. React Best Practices"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-desc">Description</Label>
            <input
              id="skill-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this skill provides"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Core Content — Edit / Preview tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Skill Content (Markdown)</Label>
              <Badge variant="secondary" className="text-[10px]">
                ~{totalTokens} tokens
              </Badge>
            </div>

            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="text-xs px-3 h-6">
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs px-3 h-6">
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="mt-2">
                <Textarea
                  value={coreContent}
                  onChange={(e) => setCoreContent(e.target.value)}
                  placeholder="Write your skill instructions in Markdown..."
                  className="min-h-[350px] font-mono text-xs leading-relaxed resize-y"
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-2">
                <ScrollArea className="h-[350px] rounded-md border border-border p-3">
                  {coreContent.trim() ? (
                    <div className="text-sm leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>,
                          code: ({ children, className }) => {
                            const isBlock = className?.includes("language-");
                            if (isBlock) {
                              return (
                                <code className="block rounded-md bg-muted/80 border px-3 py-2 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <code className="rounded bg-muted/70 border px-1 py-0.5 font-mono text-xs">{children}</code>
                            );
                          },
                          pre: ({ children }) => (
                            <pre className="my-2 rounded-md bg-muted/80 border overflow-hidden">{children}</pre>
                          ),
                          ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className="my-2 border-l-2 border-muted-foreground/40 pl-3 italic text-muted-foreground">
                              {children}
                            </blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
                              {children}
                            </a>
                          ),
                          hr: () => <hr className="my-3 border-border" />,
                          table: ({ children }) => (
                            <div className="my-2 overflow-x-auto rounded-md border">
                              <table className="w-full text-xs">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                          th: ({ children }) => <th className="px-3 py-1.5 text-left font-medium border-b">{children}</th>,
                          td: ({ children }) => <td className="px-3 py-1.5 border-b border-border/50">{children}</td>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                        }}
                      >
                        {coreContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Nothing to preview
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* References */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>References</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleImportFile}
              >
                <FileUp className="size-3" />
                Import Files
              </Button>
            </div>

            {references.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No reference files. Import .md, .txt, or .json files to include additional context.
              </p>
            ) : (
              <div className="space-y-2">
                {references.map((ref, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-md border border-border/60 p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate block">{ref.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ~{estimateTokens(ref.content)} tokens
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive hover:text-destructive"
                      onClick={() => removeReference(index)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !coreContent.trim()}>
            {initial ? "Save Changes" : "Create Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
