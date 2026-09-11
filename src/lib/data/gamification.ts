import { readJsonFile, writeJsonFile } from "@/lib/file-storage";
import {
  collectBadges,
  POINTS_BY_CATEGORY,
  severityBonus,
  snapshot,
  type AccountStore,
  type AwardInput,
  type GamificationStats,
} from "@/lib/gamification-defs";

export {
  BADGES,
  badgeById,
  type AwardInput,
  type BadgeDef,
  type BadgeTier,
  type GamificationStats,
} from "@/lib/gamification-defs";

const STORAGE_FILE = "gamification";

let store: Map<string, AccountStore> | null = null;

function loadStore(): Map<string, AccountStore> {
  if (store) return store;
  const fromFile = readJsonFile<Record<string, AccountStore>>(STORAGE_FILE, {});
  store = new Map(Object.entries(fromFile));
  return store;
}

function persistStore(): void {
  if (!store) return;
  const entries: [string, AccountStore][] = [...store.entries()];
  writeJsonFile(STORAGE_FILE, Object.fromEntries(entries));
}

/**
 * Catat laporan baru dan beri poin + lencana.
 * Identitas pelapor adalah kunci aman dari sisi server (session atau hash IP),
 * disimpan ke disk agar bertahan antar restart.
 */
export function awardReportPoints(
  reporterId: string,
  reporterName: string | null,
  input: AwardInput,
): GamificationStats {
  const accounts = loadStore();
  let account = accounts.get(reporterId);
  if (!account) {
    account = { reporterName, reports: 0, verifiedReports: 0, points: 0, badges: [] };
    accounts.set(reporterId, account);
  }
  if (reporterName) account.reporterName = reporterName;

  const earned = POINTS_BY_CATEGORY[input.category] ?? 5;
  const earnedTotal = earned + severityBonus(input.severity) + (input.hasPhoto ? 5 : 0);

  account.reports += 1;
  account.points += earnedTotal;

  const target = collectBadges({ ...account, reports: account.reports }, input, account.badges);
  const newlyEarned = target.filter((b) => !account.badges.includes(b));
  account.badges = target;

  persistStore();
  return snapshot(reporterId, account, newlyEarned, earnedTotal);
}

/** Tandai satu laporan milik reporter ini telah dikonfirmasi komunitas. */
export function markReportVerified(reporterId: string): GamificationStats {
  const accounts = loadStore();
  const account = accounts.get(reporterId);
  if (!account) return snapshot(reporterId, { reporterName: null, reports: 0, verifiedReports: 0, points: 0, badges: [] }, [], 0);
  account.verifiedReports += 1;
  const target = collectBadges({ ...account, verifiedReports: account.verifiedReports }, null, account.badges);
  const newlyEarned = target.filter((b) => !account.badges.includes(b) && b === "VERIFIED_CONTRIBUTION");
  account.badges = target;
  persistStore();
  return snapshot(reporterId, account, newlyEarned, 0);
}

/** Statistik akun; null bila belum pernah tercatat (klien mempertahankan data lokal). */
export function getGamificationStats(reporterId: string): GamificationStats | null {
  const account = loadStore().get(reporterId);
  return account ? snapshot(reporterId, account, [], 0) : null;
}

/** Membaca peringkat global (demo tanpa DB). */
export function listGamificationRanking(
  limit = 10,
): { reporterName: string; reports: number; points: number }[] {
  return [...loadStore().entries()]
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

export function hasGamificationAccount(reporterId: string): boolean {
  return loadStore().has(reporterId);
}