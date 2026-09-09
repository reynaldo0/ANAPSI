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

interface Account {
  reporterName: string | null;
  reports: number;
  verifiedReports: number;
  points: number;
  badges: BadgeId[];
}

const store = new Map<string, Account>();

export interface AwardInput {
  category: ReportCategory;
  severity: Severity;
  hasPhoto: boolean;
}

const POINTS_BY_CATEGORY: Record<ReportCategory, number> = {
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

function severityBonus(severity: Severity): number {
  switch (severity) {
    case "HIGH":
      return 5;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 0;
  }
}

function collectBadges(account: Account, pending: AwardInput | null, existing: BadgeId[]): BadgeId[] {
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

function snapshot(reporterId: string, account: Account, newlyEarned: BadgeId[], pointsEarned: number): GamificationStats {
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

/**
 * Catat laporan baru dan beri poin + lencana.
 * Akun disimpan di memori server (identitas anonim via reporterId dari perangkat).
 */
export function awardReportPoints(
  reporterId: string,
  reporterName: string | null,
  input: AwardInput,
): GamificationStats {
  let account = store.get(reporterId);
  if (!account) {
    account = { reporterName, reports: 0, verifiedReports: 0, points: 0, badges: [] };
    store.set(reporterId, account);
  }
  if (reporterName) account.reporterName = reporterName;

  const earned = POINTS_BY_CATEGORY[input.category] ?? 5;
  const earnedTotal = earned + severityBonus(input.severity) + (input.hasPhoto ? 5 : 0);

  account.reports += 1;
  account.points += earnedTotal;

  const target = collectBadges({ ...account, reports: account.reports }, input, account.badges);
  const newlyEarned = target.filter((b) => !account.badges.includes(b));
  account.badges = target;

  return snapshot(reporterId, account, newlyEarned, earnedTotal);
}

/** Tandai satu laporan milik reporter ini telah diverifikasi komunitas. */
export function markReportVerified(reporterId: string): GamificationStats {
  const account = store.get(reporterId);
  if (!account) return snapshot(reporterId, { reporterName: null, reports: 0, verifiedReports: 0, points: 0, badges: [] }, [], 0);
  account.verifiedReports += 1;
  const target = collectBadges({ ...account, verifiedReports: account.verifiedReports }, null, account.badges);
  const newlyEarned = target.filter((b) => !account.badges.includes(b) && b === "VERIFIED_CONTRIBUTION");
  account.badges = target;
  return snapshot(reporterId, account, newlyEarned, 0);
}

export function getGamificationStats(reporterId: string): GamificationStats {
  const account = store.get(reporterId);
  if (!account) {
    return {
      reporterId,
      reporterName: null,
      reports: 0,
      verifiedReports: 0,
      points: 0,
      badges: [],
      newlyEarned: [],
      pointsEarned: 0,
    };
  }
  return snapshot(reporterId, account, [], 0);
}

/** Membaca peringkat global (demo tanpa DB). */
export function listGamificationRanking(limit = 10): { reporterName: string; reports: number; points: number }[] {
  return [...store.entries()]
    .map(([id, account]) => ({
      id,
      reporterName: account.reporterName ?? "Anonim",
      reports: account.reports,
      points: account.points,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
    .map(({ reporterName, reports, points }) => ({ reporterName, reports, points }));
}