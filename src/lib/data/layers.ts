import type { AccessibilityProfileType } from "@/types";

export type LayerKind =
  | "guiding_block"
  | "pedestrian_crossing"
  | "audio_crossing_signal"
  | "obstacle"
  | "surface_hazard"
  | "ramp"
  | "stairs"
  | "elevator"
  | "path_width"
  | "surface_condition"
  | "accessible_entrance";

export type FeatureTone = "success" | "warning" | "danger" | "neutral";

export interface LayerStatus {
  symbol: string;
  label: string;
  tone: FeatureTone;
}

export interface LayerMeta {
  label: string;
  profile: AccessibilityProfileType;
  statuses: Record<string, LayerStatus>;
}

export const LAYERS: Record<LayerKind, LayerMeta> = {
  guiding_block: {
    label: "Guiding Block",
    profile: "VISUAL_NAVIGATION",
    statuses: {
      available: { symbol: "▮", label: "Tersedia", tone: "success" },
      damaged: { symbol: "▮⌁", label: "Rusak", tone: "danger" },
      interrupted: { symbol: "- - -", label: "Terputus", tone: "warning" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
  pedestrian_crossing: {
    label: "Zebra Crossing",
    profile: "VISUAL_NAVIGATION",
    statuses: {
      available: { symbol: "≡", label: "Ada", tone: "success" },
      signalized: { symbol: "●", label: "Ada dengan lampu", tone: "success" },
      non_signalized: { symbol: "○", label: "Tanpa lampu", tone: "warning" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
  audio_crossing_signal: {
    label: "Sinyal Suara Penyeberangan",
    profile: "VISUAL_NAVIGATION",
    statuses: {
      available: { symbol: "🔊", label: "Tersedia", tone: "success" },
      unavailable: { symbol: "✕", label: "Tidak tersedia", tone: "danger" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
  obstacle: {
    label: "Hambatan",
    profile: "VISUAL_NAVIGATION",
    statuses: {
      construction: { symbol: "🚧", label: "Konstruksi", tone: "danger" },
      permanent: { symbol: "⛔", label: "Permanen", tone: "danger" },
      temporary: { symbol: "🟨", label: "Sementara", tone: "warning" },
      street_furniture: { symbol: "◎", label: "Fasilitas jalan", tone: "warning" },
      other: { symbol: "⚠", label: "Lainnya", tone: "warning" },
    },
  },
  surface_hazard: {
    label: "Bahaya Permukaan",
    profile: "VISUAL_NAVIGATION",
    statuses: {
      hole: { symbol: "◌", label: "Lubang", tone: "danger" },
      damaged_sidewalk: { symbol: "▥", label: "Trotoar rusak", tone: "danger" },
      uneven_surface: { symbol: "⤫", label: "Permukaan tidak rata", tone: "warning" },
      other: { symbol: "⚠", label: "Lainnya", tone: "warning" },
    },
  },
  ramp: {
    label: "Ramp",
    profile: "WHEELCHAIR_MOBILITY",
    statuses: {
      available: { symbol: "↘", label: "Tersedia", tone: "success" },
      damaged: { symbol: "↘⚠", label: "Rusak", tone: "danger" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
  stairs: {
    label: "Tangga",
    profile: "WHEELCHAIR_MOBILITY",
    statuses: {
      none: { symbol: "✓", label: "Tanpa tangga", tone: "success" },
      present: { symbol: "≡", label: "Ada tangga", tone: "danger" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
  elevator: {
    label: "Elevator",
    profile: "WHEELCHAIR_MOBILITY",
    statuses: {
      available: { symbol: "↕", label: "Tersedia", tone: "success" },
      unavailable: { symbol: "✕", label: "Tidak tersedia", tone: "danger" },
      out_of_service: { symbol: "🚧", label: "Sedang diperbaiki", tone: "danger" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
  path_width: {
    label: "Lebar Jalur",
    profile: "WHEELCHAIR_MOBILITY",
    statuses: {
      accessible: { symbol: "⇔", label: "Aksesibel", tone: "success" },
      limited: { symbol: "↔", label: "Terbatas", tone: "warning" },
      too_narrow: { symbol: "╳", label: "Terlalu sempit", tone: "danger" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
  surface_condition: {
    label: "Kondisi Permukaan",
    profile: "WHEELCHAIR_MOBILITY",
    statuses: {
      good: { symbol: "✓", label: "Baik", tone: "success" },
      uneven: { symbol: "⤫", label: "Tidak rata", tone: "warning" },
      damaged: { symbol: "▥", label: "Rusak", tone: "danger" },
      blocked: { symbol: "✕", label: "Terhalang", tone: "danger" },
    },
  },
  accessible_entrance: {
    label: "Akses Masuk",
    profile: "WHEELCHAIR_MOBILITY",
    statuses: {
      accessible: { symbol: "↘", label: "Aksesibel", tone: "success" },
      partially_accessible: { symbol: "⚠", label: "Sebagian aksesibel", tone: "warning" },
      not_accessible: { symbol: "✕", label: "Tidak aksesibel", tone: "danger" },
      unknown: { symbol: "?", label: "Tidak diketahui", tone: "neutral" },
    },
  },
};

export const LAYER_KINDS = Object.keys(LAYERS) as LayerKind[];

export function layersForProfile(profile: AccessibilityProfileType | null): LayerKind[] {
  if (!profile) return LAYER_KINDS;
  return LAYER_KINDS.filter((kind) => LAYERS[kind].profile === profile);
}

export function statusMeta(kind: LayerKind, status: string): LayerStatus {
  return LAYERS[kind].statuses[status] ?? { symbol: "?", label: "Tidak diketahui", tone: "neutral" };
}