import * as React from "react";
import { BookOpen, Plus, Settings2 } from "lucide-react";
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
import { useSkills } from "../../shared/hooks/useSkills";
import { SkillCard } from "./SkillCard";
import { SkillEditor } from "./SkillEditor";
import type { SkillContent, SkillReference } from "../../core/skills/types";

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
    content: SkillContent;
  } | null>(null);
  const [budgetInput, setBudgetInput] = React.useState(String(tokenBudget));

  React.useEffect(() => {
    setBudgetInput(String(tokenBudget));
  }, [tokenBudget]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const enabledCount = skills.filter((s) => s.enabled).length;
  const enabledTokens = skills
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.totalTokenEstimate, 0);

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
      content,
    });
    setEditorOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    description: string;
    coreContent: string;
    references: Omit<SkillReference, "id" | "tokenEstimate">[];
  }) => {
    if (editingId) {
      await update(editingId, data);
    } else {
      await create(data.name, data.description, data.coreContent, data.references);
    }
    setEditingId(null);
    setEditInitial(null);
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
            Manage knowledge packs injected into the AI system prompt.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleNewSkill}>
          <Plus className="size-3.5" />
          New Skill
        </Button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <Badge variant="secondary" className="text-[10px]">
          {enabledCount} enabled
        </Badge>
        <span className="text-xs text-muted-foreground">
          ~{enabledTokens.toLocaleString()} / {tokenBudget.toLocaleString()} token budget
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
            items={skills.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={toggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
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
