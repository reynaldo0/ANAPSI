import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  tone?: BadgeTone;
  symbol?: string;
  children: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, { className: string; symbol: string }> = {
  success: { className: "bg-success-soft text-success", symbol: "✓" },
  warning: { className: "bg-warning-soft text-warning", symbol: "⚠" },
  danger: { className: "bg-danger-soft text-danger", symbol: "✕" },
  neutral: { className: "bg-muted text-muted-foreground", symbol: "?" },
};

export function Badge({ tone = "neutral", symbol, children, className }: BadgeProps) {
  const selected = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-8 px-2.5 py-1 text-sm font-semibold",
        selected.className,
        className,
      )}
    >
      <span aria-hidden="true">{symbol ?? selected.symbol}</span>
      {children}
    </span>
  );
}
