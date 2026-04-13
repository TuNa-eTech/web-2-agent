import * as React from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { SkillMeta } from "../../core/skills/types";

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
