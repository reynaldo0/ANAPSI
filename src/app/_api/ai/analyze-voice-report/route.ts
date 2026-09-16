import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { structureReportTranscript } from "@/lib/voice/report-structurer";
import { reportCategoryLabel } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(rateLimitKey(ip, "ai"), 20, 60_000);
    if (!rate.allowed) {
      throw new ApiError(429, "RATE_LIMITED", `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfterSeconds} detik.`);
    }

    let body: { transcript?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    if (typeof body.transcript !== "string" || body.transcript.trim().length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Transkripsi tidak boleh kosong.");
    }
    if (body.transcript.trim().length > 2000) {
      throw new ApiError(422, "VALIDATION_ERROR", "Transkripsi terlalu panjang (maksimal 2000 karakter).");
    }

    const structured = structureReportTranscript(body.transcript);
    return ok({
      provider: "deterministic",
      suggestion: {
        category: structured.category,
        categoryLabel: reportCategoryLabel(structured.category),
        description: structured.description,
        severity: structured.severity,
        affectedProfiles: structured.affectedProfiles,
        suggestedLocation: structured.suggestedLocation,
      },
      note: "AI suggestion. Tinjau sebelum mengirim.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}