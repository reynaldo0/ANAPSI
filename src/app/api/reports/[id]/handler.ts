import type { NextRequest } from "next/server";
import { ApiError, handleApiError, notFound } from "@/lib/api/errors";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { addReportVerification } from "@/lib/data/reports";
import { reporterKey } from "@/lib/reporter-key";
import { VERIFICATION_TYPES, type VerificationType } from "@/types";

export async function handleReportVerification(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  type: VerificationType,
) {
  try {
    const session = await getCurrentUser();
    const ip = clientIp(request);
    const rate = checkRateLimit(rateLimitKey(ip, `verify:${type}`), 15, 60_000);
    if (!rate.allowed) {
      throw new ApiError(429, "RATE_LIMITED", `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfterSeconds} detik.`);
    }
    const { id } = await context.params;

    let comment: string | null = null;
    try {
      const body = (await request.json()) as { comment?: unknown; type?: unknown };
      comment = typeof body.comment === "string" && body.comment.trim().length > 0 ? body.comment.trim() : null;
      if (body.type !== undefined && !VERIFICATION_TYPES.includes(body.type as VerificationType)) {
        throw new ApiError(422, "VALIDATION_ERROR", "Tipe verifikasi tidak valid.");
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    if (comment && comment.length > 500) {
      throw new ApiError(422, "VALIDATION_ERROR", "Komentar maksimal 500 karakter.");
    }

    const { data, source, gamification } = await addReportVerification(
      id,
      type,
      comment,
      session,
      reporterKey(ip, session),
    );
    if (!data) return handleApiError(notFound("Laporan tidak ditemukan."));
    return ok(gamification ? { report: data, source, gamification } : { report: data, source });
  } catch (error) {
    return handleApiError(error);
  }
}