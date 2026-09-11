import type { NextRequest } from "next/server";
import { ApiError, handleApiError, forbidden } from "@/lib/api/errors";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-session";
import { listReportsAdmin, updateReport } from "@/lib/data/reports";
import type { ReportStatus } from "@/types";

const STATUSES: readonly ReportStatus[] = [
  "PENDING",
  "VERIFIED",
  "ACTIVE",
  "OUTDATED",
  "RESOLVED",
  "REJECTED",
];

function isStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && STATUSES.includes(value as ReportStatus);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN") {
      throw forbidden("Hanya admin yang dapat mengakses panel moderasi.");
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const { data, source } = await listReportsAdmin(isStatus(status) ? status : null);
    return ok({ reports: data, source });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN") {
      throw forbidden("Hanya admin yang dapat mengubah status laporan.");
    }
    const limit = checkRateLimit(rateLimitKey(clientIp(request), "admin:update"), 30, 60_000);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.`);
    }

    let body: { id?: unknown; status?: unknown; moderationNotes?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    if (typeof body.id !== "string" || body.id.length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "ID laporan tidak valid.");
    }
    if (body.status !== undefined && !isStatus(body.status)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Status tidak valid.");
    }
    if (
      body.moderationNotes !== undefined &&
      (typeof body.moderationNotes !== "string" || body.moderationNotes.trim().length > 2000)
    ) {
      throw new ApiError(422, "VALIDATION_ERROR", "Catatan moderasi maksimal 2000 karakter.");
    }

    const patch: { status?: ReportStatus; moderationNotes?: string | null } = {};
    if (body.status !== undefined) patch.status = body.status as ReportStatus;
    if (body.moderationNotes !== undefined)
      patch.moderationNotes = (body.moderationNotes as string).trim() || null;

    const { data, source } = await updateReport(body.id, patch);
    if (!data) {
      throw new ApiError(404, "NOT_FOUND", "Laporan tidak ditemukan.");
    }
    return ok({ report: { ...data, categoryLabel: data.categoryLabel }, source });
  } catch (error) {
    return handleApiError(error);
  }
}