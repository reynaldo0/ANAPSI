import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-16 border border-border bg-card text-card-foreground shadow-card",
        className,
      )}
      {...props}
    />
  );
}
