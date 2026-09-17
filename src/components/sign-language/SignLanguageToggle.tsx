"use client";

import { Hand } from "lucide-react";
import { useSignLanguage } from "@/lib/state/SignLanguageContext";
import { cn } from "@/lib/cn";

interface SignLanguageToggleProps {
  className?: string;
}

export function SignLanguageToggle({ className }: SignLanguageToggleProps) {
  const { enabled, toggle } = useSignLanguage();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-12 border-2 px-3 text-sm font-bold transition-colors",
        enabled
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
        className,
      )}
    >
      <Hand className="h-4 w-4" aria-hidden="true" />
      <span>{enabled ? "Bahasa Isyarat: Aktif" : "Bahasa Isyarat: Mati"}</span>
      <span
        className={cn(
          "ml-1 inline-block h-2.5 w-2.5 rounded-full",
          enabled ? "bg-primary" : "bg-muted-foreground/50",
        )}
        aria-hidden="true"
      />
    </button>
  );
}