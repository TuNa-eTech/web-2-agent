import * as React from "react";
import { BookOpen, FileUp, LayoutTemplate, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSkills } from "../../shared/hooks/useSkills";
import { SkillCard } from "./SkillCard";
import { SkillEditor } from "./SkillEditor";
import type { SkillContent, SkillReference, SkillInjection, SkillKind } from "../../core/skills/types";
import { SKILL_KINDS, SKILL_KIND_LABELS } from "../../core/skills/types";
import { SKILL_TEMPLATES } from "../../core/skills/templates";
import { importSkillFromMarkdown } from "../../core/skills/fileImport";

export const SkillsPanel = () => {
  const {
    loading,
    skills,
    tokenBudget,
    create,
    update,
    remove,
    toggle,
    reorder,
    setBudget,
    getContent,
  } = useSkills();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editInitial, setEditInitial] = React.useState<{
    name: string;
    description: string;
    injection: SkillInjection;
    kind: SkillKind;
    tags: string[];
    content: SkillContent;
  } | null>(null);
  const [kindFilter, setKindFilter] = React.useState<SkillKind | "all">("all");
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [budgetInput, setBudgetInput] = React.useState(String(tokenBudget));

  React.useEffect(() => {
    setBudgetInput(String(tokenBudget));
  }, [tokenBudget]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const enabledSkills = skills.filter((s) => s.enabled);
  const alwaysCount = enabledSkills.filter((s) => s.injection === "always").length;
  const autoCount = enabledSkills.filter((s) => s.injection === "auto").length;
  const alwaysTokens = enabledSkills
    .filter((s) => s.injection === "always")
    .reduce((sum, s) => sum + s.totalTokenEstimate, 0);

  const presentKinds = React.useMemo(() => {
    const set = new Set<SkillKind>();
    for (const s of skills) set.add(s.kind ?? "general");
    return set;
  }, [skills]);

  const filteredSkills =
    kindFilter === "all"
      ? skills
      : skills.filter((s) => (s.kind ?? "general") === kindFilter);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = skills.findIndex((s) => s.id === active.id);
    const newIndex = skills.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...skills];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    void reorder(reordered.map((s) => s.id));
  };

  const handleNewSkill = () => {
    setEditingId(null);
    setEditInitial(null);
    setEditorOpen(true);
  };

  const handleEdit = async (id: string) => {
    const meta = skills.find((s) => s.id === id);
    const content = await getContent(id);
    if (!meta || !content) return;

    setEditingId(id);
    setEditInitial({
      name: meta.name,
      description: meta.description,
      injection: meta.injection ?? "always",
      kind: meta.kind ?? "general",
      tags: meta.tags ?? [],
      content,
    });
    setEditorOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    description: string;
    coreContent: string;
    references: Omit<SkillReference, "id" | "tokenEstimate">[];
    injection: SkillInjection;
    kind: SkillKind;
    tags: string[];
  }) => {
    if (editingId) {
      await update(editingId, data);
    } else {
      await create(
        data.name,
        data.description,
        data.coreContent,
        data.references,
        data.injection,
        data.tags,
        data.kind,
      );
    }
    setEditingId(null);
    setEditInitial(null);
  };

  const handleImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const raw = await file.text();
      const imported = importSkillFromMarkdown(file.name, raw);
      await create(
        imported.name,
        imported.description,
        imported.coreContent,
        [],
        imported.injection,
        imported.tags,
        imported.kind,
      );
    };
    input.click();
  };

  const handleUseTemplate = async (kind: SkillKind) => {
    const tpl = SKILL_TEMPLATES[kind];
    setTemplatesOpen(false);
    setEditingId(null);
    setEditInitial({
      name: tpl.name,
      description: tpl.description,
      injection: tpl.injection,
      kind: tpl.kind,
      tags: tpl.tags,
      content: { coreContent: tpl.coreContent, references: [] },
    });
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this skill?")) {
      await remove(id);
    }
  };

  const handleBudgetBlur = () => {
    const n = parseInt(budgetInput, 10);
    if (!isNaN(n) && n > 0 && n !== tokenBudget) {
      void setBudget(n);
    } else {
      setBudgetInput(String(tokenBudget));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="size-4" />
            Skills
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage instruction packs (AGENTS, SOUL, TOOLS, WORKFLOW…) injected into the AI system prompt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleImportFile}
          >
            <FileUp className="size-3.5" />
            Import .md
          </Button>
          <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <LayoutTemplate className="size-3.5" />
                Templates
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1">
              {SKILL_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => void handleUseTemplate(k)}
                  className="flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <span className="font-medium">{SKILL_KIND_LABELS[k]}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {SKILL_TEMPLATES[k].description}
                  </span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button size="sm" className="gap-1.5" onClick={handleNewSkill}>
            <Plus className="size-3.5" />
            New Skill
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <Badge variant="secondary" className="text-[10px]">
          {alwaysCount} always
        </Badge>
        {autoCount > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {autoCount} auto
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          ~{alwaysTokens.toLocaleString()} fixed + auto / {tokenBudget.toLocaleString()} budget
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="token-budget" className="text-[10px] text-muted-foreground">
            Budget:
          </Label>
          <input
            id="token-budget"
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            onBlur={handleBudgetBlur}
            onKeyDown={(e) => e.key === "Enter" && handleBudgetBlur()}
            className="h-7 w-20 rounded-md border border-input bg-transparent px-2 text-xs text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <Separator />

      {/* Kind filter — only show when user has more than one kind */}
      {presentKinds.size > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setKindFilter("all")}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
              kindFilter === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30"
            }`}
          >
            All ({skills.length})
          </button>
          {SKILL_KINDS.filter((k) => presentKinds.has(k)).map((k) => {
            const count = skills.filter((s) => (s.kind ?? "general") === k).length;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                  kindFilter === k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                {SKILL_KIND_LABELS[k]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Skill list with drag-and-drop */}
      {skills.length === 0 ? (
        <div className="text-center py-8">
          <BookOpen className="size-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No skills yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first skill to enhance AI responses with custom knowledge.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredSkills.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={toggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
              {filteredSkills.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No skills in this category.
                </p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Editor dialog */}
      <SkillEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editInitial ?? undefined}
        onSave={handleSave}
      />
    </div>
  );
};
