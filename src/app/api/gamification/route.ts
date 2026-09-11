import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { clientIp } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getGamificationStats, listGamificationRanking } from "@/lib/data/gamification";
import { reporterKey } from "@/lib/reporter-key";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const declaredReporterId = url.searchParams.get("reporterId");
    const ranking = url.searchParams.get("ranking");
    const session = await getCurrentUser();

    // Identitas dihitung dari sesi/IP — parametir reporterId dari klien
    // TIDAK dipercaya, sehingga statistik pengguna lain tidak bisa dibaca.
    const resolvedKey = reporterKey(clientIp(request), session);
    const rawStats = getGamificationStats(resolvedKey);
    const stats = rawStats
      ? { ...rawStats, reporterId: declaredReporterId ?? rawStats.reporterId }
      : null;

    const leaderboard = ranking === "1" ? listGamificationRanking() : null;
    return ok({ stats, leaderboard });
  } catch (error) {
    return handleApiError(error);
  }
}