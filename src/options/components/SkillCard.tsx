import * as React from "react";
import {
  Bot,
  BookOpen,
  GitBranch,
  GripVertical,
  Pencil,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { SkillMeta, SkillKind } from "../../core/skills/types";

const KIND_META: Record<
  SkillKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  general: { label: "General", icon: BookOpen, className: "bg-muted text-muted-foreground border-border" },
  agent: { label: "Agent", icon: Bot, className: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400" },
  soul: { label: "Soul", icon: Sparkles, className: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400" },
  tools: { label: "Tools", icon: Wrench, className: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400" },
  workflow: { label: "Workflow", icon: GitBranch, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" },
};

type SkillCardProps = {
  skill: SkillMeta;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export const SkillCard = ({ skill, onToggle, onEdit, onDelete }: SkillCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: skill.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 hover:border-border"
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{skill.name}</span>
          {(() => {
            const k = skill.kind ?? "general";
            const kindMeta = KIND_META[k];
            const Icon = kindMeta.icon;
            return (
              <span
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0 text-[10px] font-medium shrink-0 ${kindMeta.className}`}
              >
                <Icon className="size-2.5" />
                {kindMeta.label}
              </span>
            );
          })()}
          <Badge
            variant={skill.injection === "always" ? "default" : "outline"}
            className="text-[10px] shrink-0"
          >
            {skill.injection === "always" ? "Always" : "Auto"}
          </Badge>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            ~{skill.totalTokenEstimate} tokens
          </Badge>
        </div>
        {skill.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {skill.description}
            {skill.injection === "auto" && skill.tags.length > 0 && (
              <span className="ml-1 text-muted-foreground/60">
                [{skill.tags.join(", ")}]
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Switch
          checked={skill.enabled}
          onCheckedChange={(checked) => onToggle(skill.id, checked)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => onEdit(skill.id)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(skill.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
