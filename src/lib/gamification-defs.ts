import type { ReportCategory, Severity } from "@/types";

export type BadgeId =
  | "FIRST_REPORT"
  | "THREE_REPORTS"
  | "FIVE_REPORTS"
  | "PHOTO_REPORT"
  | "HIGH_SEVERITY"
  | "VERIFIED_CONTRIBUTION";

export type BadgeTier = "bronze" | "silver" | "gold" | "special";

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
}

export const BADGES: readonly BadgeDef[] = [
  {
    id: "FIRST_REPORT",
    name: "Bintang Pelapor",
    description: "Kirim laporan pertamamu.",
    icon: "🌟",
    tier: "bronze",
  },
  {
    id: "THREE_REPORTS",
    name: "Penjaga Aksesibilitas",
    description: "Kirim 3 laporan terbukti.",
    icon: "🛡️",
    tier: "silver",
  },
  {
    id: "FIVE_REPORTS",
    name: "Pahlawan Trotoar",
    description: "Kirim 5 laporan atau lebih.",
    icon: "🏅",
    tier: "gold",
  },
  {
    id: "PHOTO_REPORT",
    name: "Mata Elang",
    description: "Lapor dengan foto bukti.",
    icon: "📸",
    tier: "special",
  },
  {
    id: "HIGH_SEVERITY",
    name: "Pemberani",
    description: "Laporkan kondisi berbahaya.",
    icon: "⚠️",
    tier: "special",
  },
  {
    id: "VERIFIED_CONTRIBUTION",
    name: "Terpercaya",
    description: "Laporanmu diverifikasi komunitas.",
    icon: "✅",
    tier: "special",
  },
];

export function badgeById(id: BadgeId): BadgeDef {
  return BADGES.find((b) => b.id === id) ?? BADGES[0];
}

export interface GamificationStats {
  reporterId: string;
  reporterName: string | null;
  reports: number;
  verifiedReports: number;
  points: number;
  badges: BadgeId[];
  newlyEarned: BadgeId[];
  pointsEarned: number;
}

export interface AccountStore {
  reporterName: string | null;
  reports: number;
  verifiedReports: number;
  points: number;
  badges: BadgeId[];
}

export interface AwardInput {
  category: ReportCategory;
  severity: Severity;
  hasPhoto: boolean;
}

export const POINTS_BY_CATEGORY: Record<ReportCategory, number> = {
  STAIRS: 10,
  DAMAGED_RAMP: 15,
  RAMP: 5,
  GUIDING_BLOCK: 15,
  DAMAGED_SIDEWALK: 15,
  OBSTACLE: 12,
  ELEVATOR: 15,
  ACCESSIBLE_FACILITY: 5,
  OTHER: 5,
};

export function severityBonus(severity: Severity): number {
  switch (severity) {
    case "HIGH":
      return 5;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 0;
  }
}

export function collectBadges(
  account: AccountStore,
  pending: AwardInput | null,
  existing: BadgeId[],
): BadgeId[] {
  const earned = new Set<BadgeId>(existing);
  const { reports } = account;
  if (reports >= 1) earned.add("FIRST_REPORT");
  if (reports >= 3) earned.add("THREE_REPORTS");
  if (reports >= 5) earned.add("FIVE_REPORTS");
  if (account.verifiedReports >= 1) earned.add("VERIFIED_CONTRIBUTION");
  if (pending?.hasPhoto) earned.add("PHOTO_REPORT");
  if (pending?.severity === "HIGH") earned.add("HIGH_SEVERITY");
  return [...earned];
}

export function snapshot(
  reporterId: string,
  account: AccountStore,
  newlyEarned: BadgeId[],
  pointsEarned: number,
): GamificationStats {
  return {
    reporterId,
    reporterName: account.reporterName,
    reports: account.reports,
    verifiedReports: account.verifiedReports,
    points: account.points,
    badges: account.badges,
    newlyEarned,
    pointsEarned,
  };
}