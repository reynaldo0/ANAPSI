import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = checkRateLimit(rateLimitKey(ip, "chatbot-stt"), 10, 60_000);
    if (!rl.allowed) throw new ApiError(429, "RATE_LIMITED", "Terlalu sering transcribe");
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new ApiError(503, "STT_UNAVAILABLE", "Groq belum dikonfigurasi. Gunakan dikte browser sebagai fallback.");

    const form = await req.formData();
    const file = form.get("audio") as File | null;
    if (!file) throw new ApiError(422, "VALIDATION_ERROR", "File audio wajib (field 'audio')");
    if (file.size > 10 * 1024 * 1024) throw new ApiError(422, "VALIDATION_ERROR", "Audio maksimal 10MB");

    const groq = new Groq({ apiKey: groqKey });
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "id",
      response_format: "json",
    } as unknown as Parameters<InstanceType<typeof Groq>["audio"]["transcriptions"]["create"]>[0]);
    return ok({ transcript: (transcription as { text: string }).text, model: "whisper-large-v3-turbo" });
  } catch (e) { return handleApiError(e); }
}
