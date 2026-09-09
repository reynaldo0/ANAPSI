"use client";

import { HelpCircle } from "lucide-react";
import { startGuideTour } from "@/lib/guide-tour";
import type { TourFeature } from "@/lib/tutorials";
import { cn } from "@/lib/cn";

interface TourTriggerProps {
  feature: TourFeature;
  label?: string;
  className?: string;
}

/** Tombol "Lihat Tutorial" untuk menjalankan ulang tutorial fitur. */
export function TourTrigger({ feature, label = "Lihat Tutorial", className }: TourTriggerProps) {
  return (
    <button
      type="button"
      onClick={() => startGuideTour(feature)}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border-2 border-border bg-card px-4 text-sm font-bold text-muted-foreground shadow-soft hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
      {label}
    </button>
  );
}