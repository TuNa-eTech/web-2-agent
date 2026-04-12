import * as React from "react";
import { cn } from "@/lib/utils";

export const Skeleton = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "animate-pulse rounded-[18px] bg-linear-to-r from-muted via-white/80 to-muted",
      className,
    )}
    {...props}
  />
);
