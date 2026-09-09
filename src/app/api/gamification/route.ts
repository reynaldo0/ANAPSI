import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getGamificationStats, listGamificationRanking } from "@/lib/data/gamification";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const reporterId = url.searchParams.get("reporterId");
    const ranking = url.searchParams.get("ranking");

    const stats = reporterId ? getGamificationStats(reporterId) : null;
    const leaderboard = ranking === "1" ? listGamificationRanking() : null;
    return ok({ stats, leaderboard });
  } catch (error) {
    return handleApiError(error);
  }
}