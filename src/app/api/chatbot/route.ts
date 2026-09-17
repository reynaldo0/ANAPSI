import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { askAssistant } from "@/lib/ai/assistant";

const SYSTEM_PROMPT = `Kamu adalah ANAPSI Voice Chatbot khusus tunanetra. Berbeda dari Asisten deterministik: kamu adalah teman ngobrol empatik, ringkas, audio-first.
Aturan:
- Jawab singkat (1-3 kalimat), bahasa Indonesia, ramah, tidak bertele-tele.
- Selalu akhiri dengan 1 aksi yang bisa dilakukan: "Mau saya carikan rute, bacakan hambatan, atau laporkan?"
- Jika user tanya aksesibilitas spesifik tempat, JANGAN mengarang. Katakan "Saya cek data ANAPSI dulu ya" dan rangkum data yang diberikan di konteks.
- Prioritas: keselamatan > kecepatan > keindahan bahasa.
- Jangan output markdown berat, gunakan teks datar yang enak dibacakan TTS.`;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rl = checkRateLimit(rateLimitKey(ip, "chatbot"), 20, 60_000);
    if (!rl.allowed) throw new ApiError(429, "RATE_LIMITED", `Terlalu sering. Coba lagi ${rl.retryAfterSeconds} detik.`);
    const body = await req.json() as { message?: string; history?: { role: "user"|"assistant"; content: string }[] };
    const msg = typeof body.message === "string" ? body.message.trim() : "";
    if (!msg) throw new ApiError(422, "VALIDATION_ERROR", "Pesan tidak boleh kosong");
    if (msg.length > 1000) throw new ApiError(422, "VALIDATION_ERROR", "Pesan maksimal 1000 karakter");

    // Ambil konteks data ANAPSI deterministik (tidak mengarang)
    let context = "";
    try { const ans = askAssistant({ message: msg }); context = `DATA ANAPSI: intent=${ans.intent} | ${ans.answerText} Bullets: ${ans.bullets.slice(0,3).join("; ")}`; } catch {}

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      // Fallback deterministik tanpa Groq - tetap berguna
      const ans = askAssistant({ message: msg });
      return ok({ reply: `${ans.answerText} ${ans.bullets[0] ?? ""}`.trim(), source: "deterministic-fallback", context, disclaimer: "Jawaban dari data ANAPSI yang terverifikasi." });
    }

    const groq = new Groq({ apiKey: groqKey });
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nKonteks data:\n" + context },
        ...history.map(h => ({ role: h.role as "user"|"assistant", content: h.content })),
        { role: "user", content: msg },
      ],
    });
    const reply = completion.choices[0]?.message?.content?.trim() || "Maaf, saya belum menangkap. Bisa ulangi lebih pelan?";
    return ok({ reply, source: "ai", model: "llama-3.3-70b-versatile" });
  } catch (e) { return handleApiError(e); }
}
