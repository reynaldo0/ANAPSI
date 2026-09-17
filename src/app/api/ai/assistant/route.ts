import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { ASSISTANT_DISCLAIMER, askAssistant } from "@/lib/ai/assistant";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(rateLimitKey(ip, "ai"), 20, 60_000);
    if (!rate.allowed) {
      throw new ApiError(429, "RATE_LIMITED", `Terlalu banyak pertanyaan. Coba lagi dalam ${rate.retryAfterSeconds} detik.`);
    }

    let body: { message?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    if (typeof body.message !== "string" || body.message.trim().length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Pertanyaan tidak boleh kosong.");
    }
    if (body.message.trim().length > 400) {
      throw new ApiError(422, "VALIDATION_ERROR", "Pertanyaan terlalu panjang (maksimal 400 karakter).");
    }

    const answer = askAssistant({ message: body.message });
    return ok({ answer, disclaimer: ASSISTANT_DISCLAIMER });
  } catch (error) {
    return handleApiError(error);
  }
}