import type { AccessibilityProfileType, AffectedProfile, ReportCategory, Severity } from "@/types";
import { Accessibility, Eye, Sparkles, type LucideIcon } from "lucide-react";

export const APP_NAME = "ANAPSI";
export const APP_TAGLINE = "Navigate Beyond Barriers";

/** Pilihan pertama saat membuka aplikasi: nondisabilitas atau penyandang disabilitas. */
export type UserType = AccessibilityProfileType | "NON_DISABLED";

export interface OnboardingChoiceMeta {
  value: UserType;
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
}

export function isDisabilityUserType(value: UserType | null | undefined): boolean {
  return value === "VISUAL_NAVIGATION" || value === "WHEELCHAIR_MOBILITY";
}

export const ACCESSIBILITY_PROFILES: readonly {
  value: AccessibilityProfileType;
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "VISUAL_NAVIGATION",
    label: "Tunanetra",
    tagline: "Panduan suara 2 arah",
    icon: Eye,
    description:
      "Saya tunanetra: butuh panduan suara, perintah bicara, dan semua dibacakan dengan jelas.",
  },
  {
    value: "WHEELCHAIR_MOBILITY",
    label: "Tunadaksa (Kursi Roda)",
    tagline: "Rute bebas tangga",
    icon: Accessibility,
    description:
      "Saya tunadaksa: butuh rute bebas tangga, pintu lebar, ramp, dan tombol besar yang mudah ditekan.",
  },
];

export const ONBOARDING_CHOICES: readonly OnboardingChoiceMeta[] = [
  {
    value: "NON_DISABLED",
    label: "Tanpa disabilitas",
    tagline: "Pengalaman standar",
    icon: Sparkles,
    description:
      "Saya tanpa disabilitas: saya bisa masuk, melapor, memverifikasi, dan membantu menjaga data komunitas tetap terbaru.",
  },
  ...ACCESSIBILITY_PROFILES.map((p) => ({ ...p })),
];

export const STORAGE_KEYS = {
  appearance: "blindspot:appearance",
  handsFree: "blindspot:handsFree",
  profile: "blindspot:profile",
  session: "blindspot:session",
  userType: "blindspot:userType",
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/map", label: "Peta", icon: "map" },
  { href: "/report", label: "Lapor", icon: "megaphone" },
  { href: "/community", label: "Komunitas", icon: "users" },
  { href: "/profile", label: "Profil", icon: "user" },
] as const;

export const REPORT_CATEGORIES: readonly { value: ReportCategory; label: string }[] = [
  { value: "STAIRS", label: "Tangga (tanpa ramp/tangan)" },
  { value: "DAMAGED_RAMP", label: "Ramp rusak" },
  { value: "RAMP", label: "Ramp tersedia" },
  { value: "GUIDING_BLOCK", label: "Guiding block hilang/terputus" },
  { value: "DAMAGED_SIDEWALK", label: "Trotoar rusak" },
  { value: "OBSTACLE", label: "Hambatan di jalur" },
  { value: "ELEVATOR", label: "Elevator tidak berfungsi" },
  { value: "ACCESSIBLE_FACILITY", label: "Fasilitas aksesibel tersedia" },
  { value: "OTHER", label: "Lainnya" },
];

export function reportCategoryLabel(category: ReportCategory): string {
  return REPORT_CATEGORIES.find((c) => c.value === category)?.label ?? "Lainnya";
}

export const AFFECTED_PROFILES: readonly { value: AffectedProfile; label: string }[] = [
  { value: "WHEELCHAIR_MOBILITY", label: "♿ Tunadaksa (kursi roda)" },
  { value: "VISUAL_NAVIGATION", label: "👁️ Tunanetra" },
  { value: "BOTH", label: "🧑‍🤝‍🧑 Keduanya" },
];

export const SEVERITY_OPTIONS: readonly { value: Severity; label: string }[] = [
  { value: "HIGH", label: "Tinggi — kondisi berbahaya" },
  { value: "MEDIUM", label: "Sedang — cukup mengganggu" },
  { value: "LOW", label: "Rendah — informasi kecil" },
];

export function severityLabel(severity: Severity): string {
  return SEVERITY_OPTIONS.find((s) => s.value === severity)?.label ?? "Sedang";
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
