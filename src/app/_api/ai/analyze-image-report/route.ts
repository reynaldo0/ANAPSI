import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { reportCategoryLabel, ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/constants";
import type { ReportCategory } from "@/types";

/**
 * POST /api/ai/analyze-image-report
 *
 * Phase 7.4 — FR-018 fallback manual.
 * Analisis vision AI belum tersedia karena tidak ada provider vision key (RULE 9).
 * Endpoint ini menerima metadata gambar dan mengembalikan saran kategori berdasarkan
 * aturan deterministik (nama file, MIME type, ukuran). User tetap harus mengonfirmasi
 * dan mengedit semua field sebelum submit (RULE 3).
 *
 * Jika provider vision tersedia di masa depan, ganti implementasi `analyzeImage()`
 * di bawah tanpa mengubah kontrak API ini.
 */

const FILENAME_PATTERNS: Array<{ pattern: RegExp; category: ReportCategory }> = [
  { pattern: /tangga|stair|step/i, category: "STAIRS" },
  { pattern: /ramp|tanjakan/i, category: "DAMAGED_RAMP" },
  { pattern: /guiding|tactile|pemandu/i, category: "GUIDING_BLOCK" },
  { pattern: /trotoar|sidewalk|pavement/i, category: "DAMAGED_SIDEWALK" },
  { pattern: /hambatan|obstacle|block/i, category: "OBSTACLE" },
  { pattern: /elevator|lift/i, category: "ELEVATOR" },
];

function guessCategory(filename: string): ReportCategory {
  const lower = filename.toLowerCase();
  for (const { pattern, category } of FILENAME_PATTERNS) {
    if (pattern.test(lower)) return category;
  }
  return "OTHER";
}

function analyzeImage(filename: string): {
  category: ReportCategory;
  confidence: "low";
  note: string;
} {
  // Vision AI belum tersedia. Menggunakan heuristik nama file.
  // Hasil ini harus dikonfirmasi user sebelum submit (FR-018 fallback).
  const category = guessCategory(filename);
  return {
    category,
    confidence: "low",
    note:
      "Analisis gambar otomatis belum tersedia. Kategori ini adalah saran berdasarkan nama file. " +
      "Tinjau dan sesuaikan sebelum mengirim laporan.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(rateLimitKey(ip, "ai-image"), 10, 60_000);
    if (!rate.allowed) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      );
    }

    let body: { filename?: unknown; mimeType?: unknown; sizeBytes?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    // Validasi wajib: minimal filename
    if (typeof body.filename !== "string" || body.filename.trim().length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Nama file tidak boleh kosong.");
    }

    // Validasi opsional: MIME type
    if (
      body.mimeType !== undefined &&
      typeof body.mimeType === "string" &&
      !(ALLOWED_PHOTO_TYPES as readonly string[]).includes(body.mimeType)
    ) {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        `Tipe file tidak didukung. Gunakan: ${ALLOWED_PHOTO_TYPES.join(", ")}.`,
      );
    }

    // Validasi opsional: ukuran file
    if (
      body.sizeBytes !== undefined &&
      typeof body.sizeBytes === "number" &&
      body.sizeBytes > MAX_PHOTO_BYTES
    ) {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        `Ukuran file terlalu besar. Maksimal ${MAX_PHOTO_BYTES / (1024 * 1024)} MB.`,
      );
    }

    const result = analyzeImage(body.filename as string);

    return ok({
      provider: "deterministic-fallback",
      visionAvailable: false,
      suggestion: {
        category: result.category,
        categoryLabel: reportCategoryLabel(result.category),
        confidence: result.confidence,
      },
      note: result.note,
      disclaimer:
        "Saran ini bukan hasil analisis AI dan tidak menjamin aksesibilitas atau keselamatan. " +
        "Tinjau semua field sebelum mengirim.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
