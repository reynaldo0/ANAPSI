import type { LucideIcon } from "lucide-react";
import { Accessibility, AlertTriangle, HelpCircle, XCircle } from "lucide-react";
import type { ScoreLevel } from "@/types";
import { cn } from "@/lib/cn";

const MARKERS: Record<
  ScoreLevel,
  { label: string; icon: LucideIcon; shape: string; tone: string }
> = {
  accessible: {
    label: "Aksesibel",
    icon: Accessibility,
    shape: "rounded-full",
    tone: "bg-primary text-primary-foreground",
  },
  limited: {
    label: "Akses Terbatas",
    icon: AlertTriangle,
    shape: "rounded-8",
    tone: "bg-warning-soft text-warning",
  },
  "not-accessible": {
    label: "Tidak Aksesibel",
    icon: XCircle,
    shape: "rounded-8",
    tone: "bg-danger-soft text-danger",
  },
  unknown: {
    label: "Data Belum Tersedia",
    icon: HelpCircle,
    shape: "rounded-full border-2 border-dashed border-muted-foreground",
    tone: "bg-muted text-muted-foreground",
  },
};

interface MapMarkerProps {
  label: string;
  status: ScoreLevel;
  selected?: boolean;
}

export function MapMarker({ label, status, selected = false }: MapMarkerProps) {
  const meta = MARKERS[status];
  const Icon = meta.icon;
  return (
    <span
      aria-label={`${label}: ${meta.label}`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center shadow-float outline-offset-2",
        meta.shape,
        meta.tone,
        selected ? "outline outline-2 outline-foreground" : "outline-1 outline-border",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}