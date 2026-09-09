import { reportCategoryLabel } from "@/lib/constants";
import type { AffectedProfile, ReportCategory, Severity } from "@/types";

export interface StructuredReport {
  category: ReportCategory;
  description: string;
  severity: Severity;
  affectedProfiles: AffectedProfile[];
  suggestedLocation: string | null;
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function hasAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function detectCategory(text: string): ReportCategory {
  const t = normalize(text);
  if (hasAny(t, ["guiding block", "guiding", "taktil", "paving kuning", "marka taktil"])) return "GUIDING_BLOCK";
  if (hasAny(t, ["ramp"])) {
    if (hasAny(t, ["rusak", "retak", "berlubang", "patah", "pecah"])) return "DAMAGED_RAMP";
    return "RAMP";
  }
  if (hasAny(t, ["tangga", "anak tangga", "stepping"])) return "STAIRS";
  if (hasAny(t, ["trotoar", "trottoir", "pinggir jalan", "jalan setapak"])) {
    if (hasAny(t, ["rusak", "lubang", "retak", "hancur"])) return "DAMAGED_SIDEWALK";
    return "DAMAGED_SIDEWALK";
  }
  if (hasAny(t, ["elevator", "lift"])) return "ELEVATOR";
  if (hasAny(t, ["ramah", "aksesibel", "tersedia", "toilet", "kursi roda"])) return "ACCESSIBLE_FACILITY";
  if (hasAny(t, ["hambatan", "penghalang", "obstacle", "menghalangi", "terhalang", "barikade"])) return "OBSTACLE";
  return "OTHER";
}

function detectSeverity(text: string): Severity {
  const t = normalize(text);
  if (hasAny(t, ["darurat", "bahaya", "sangat parah", "parah", "kritis", "mendesak"])) return "HIGH";
  if (hasAny(t, ["ringan", "kecil", "sedikit", "minor", "biasa"])) return "LOW";
  return "MEDIUM";
}

function detectProfiles(text: string): AffectedProfile[] {
  const t = normalize(text);
  const wheelchair = hasAny(t, ["kursi roda", "tunadaksa", "wheelchair", "difabel duduk", "naik kursi"]);
  const visual = hasAny(t, ["tunanetra", "buta", "visual", "tongkat", "low vision", "netra"]);
  if (wheelchair && visual) return ["BOTH"];
  if (wheelchair) return ["WHEELCHAIR_MOBILITY"];
  if (visual) return ["VISUAL_NAVIGATION"];
  return [];
}

function detectLocation(text: string): string | null {
  const t = text.trim();
  const near = t.match(/(?:di (dekat|sekitar|depan|belakang|samping|area|kawasan)[^\.,]*)/i);
  if (near && near[0]) return near[0];
  const mentions = t.match(/(?:tangga|pintu|depan|halte|stasiun|perempatan|trotoar|jalur)[^.,]{0,60}/i);
  return mentions ? mentions[0].trim() : null;
}

export function structureReportTranscript(transcript: string): StructuredReport {
  return {
    category: detectCategory(transcript),
    description: transcript.trim(),
    severity: detectSeverity(transcript),
    affectedProfiles: detectProfiles(transcript),
    suggestedLocation: detectLocation(transcript),
  };
}

export function categoryLabel(category: ReportCategory): string {
  return reportCategoryLabel(category);
}