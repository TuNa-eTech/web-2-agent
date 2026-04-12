import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "border-input bg-background/90 placeholder:text-muted-foreground/90 focus-visible:ring-ring/50 flex min-h-24 w-full rounded-md border px-4 py-3 text-sm shadow-inner outline-none transition-colors focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));

Textarea.displayName = "Textarea";
