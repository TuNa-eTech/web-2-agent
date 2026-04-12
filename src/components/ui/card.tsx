import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "app-surface rounded-xl text-card-foreground",
      className,
    )}
    {...props}
  />
);

export const CardHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-2 p-4", className)} {...props} />
);

export const CardTitle = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn("text-lg font-semibold tracking-tight", className)}
    {...props}
  />
);

export const CardDescription = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn("text-muted-foreground text-sm leading-6", className)}
    {...props}
  />
);

export const CardAction = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div className={cn("flex items-center gap-2 self-start", className)} {...props} />
);

export const CardContent = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div className={cn("px-6 pb-6", className)} {...props} />
);

export const CardFooter = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn("flex items-center gap-3 px-6 pb-6", className)}
    {...props}
  />
);
