import type { NextRequest } from "next/server";
import { ApiError, handleApiError, notFound } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getReportDetail, isReportCategory, updateReport, type ReportPatch } from "@/lib/data/reports";
import type { AffectedProfile, ReportStatus, Severity } from "@/types";

const SEVERITIES: readonly Severity[] = ["HIGH", "MEDIUM", "LOW"];
const STATUSES: readonly ReportStatus[] = [
  "PENDING",
  "VERIFIED",
  "ACTIVE",
  "OUTDATED",
  "RESOLVED",
  "REJECTED",
];

function isAffectedProfile(value: unknown): value is AffectedProfile {
  return (
    value === "BOTH" ||
    value === "WHEELCHAIR_MOBILITY" ||
    value === "VISUAL_NAVIGATION"
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { data, source } = await getReportDetail(id);
    if (!data) return handleApiError(notFound("Laporan tidak ditemukan."));
    return ok({ report: data, source });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentUser();
    const { id } = await context.params;

    let body: { category?: unknown; description?: unknown; severity?: unknown; status?: unknown; affectedProfiles?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    const patch: ReportPatch = {};
    if (body.category !== undefined) {
      if (!isReportCategory(body.category)) {
        throw new ApiError(422, "VALIDATION_ERROR", "Kategori tidak valid.");
      }
      patch.category = body.category;
    }
    if (body.description !== undefined) {
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (description.length < 10 || description.length > 2000) {
        throw new ApiError(422, "VALIDATION_ERROR", "Deskripsi minimal 10 karakter.");
      }
      patch.description = description;
    }
    if (body.severity !== undefined) {
      if (!SEVERITIES.includes(body.severity as Severity)) {
        throw new ApiError(422, "VALIDATION_ERROR", "Tingkat keparahan tidak valid.");
      }
      patch.severity = body.severity as Severity;
    }
    if (body.affectedProfiles !== undefined) {
      if (!Array.isArray(body.affectedProfiles) || !body.affectedProfiles.every(isAffectedProfile)) {
        throw new ApiError(422, "VALIDATION_ERROR", "Profil terdampak tidak valid.");
      }
      patch.affectedProfiles = body.affectedProfiles as AffectedProfile[];
    }
    if (body.status !== undefined) {
      if (session?.role !== "ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Hanya admin yang dapat mengubah status laporan.");
      }
      if (!STATUSES.includes(body.status as ReportStatus)) {
        throw new ApiError(422, "VALIDATION_ERROR", "Status tidak valid.");
      }
      patch.status = body.status as ReportStatus;
    }

    const before = await getReportDetail(id);
    if (!before.data) return handleApiError(notFound("Laporan tidak ditemukan."));

    const { data, source } = await updateReport(id, patch);
    return ok({ report: data, source });
  } catch (error) {
    return handleApiError(error);
  }
}