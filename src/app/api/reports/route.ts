import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { validatePhotoDataUrl } from "@/lib/api/media";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { reportCategoryLabel } from "@/lib/constants";
import { awardReportPoints } from "@/lib/data/gamification";
import { createReport, isReportCategory, listReports } from "@/lib/data/reports";
import type { AccessibilityProfileType, AffectedProfile, Severity, SubmitReportInput } from "@/types";

const PROFILES: readonly AccessibilityProfileType[] = ["VISUAL_NAVIGATION", "WHEELCHAIR_MOBILITY"];
const SEVERITIES: readonly Severity[] = ["HIGH", "MEDIUM", "LOW"];

function isAffectedProfile(value: unknown): value is AffectedProfile {
  return value === "BOTH" || (typeof value === "string" && PROFILES.includes(value as AccessibilityProfileType));
}

function validateBooleanLike(value: unknown): boolean {
  return value === "1" || value === "true";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const placeId = url.searchParams.get("placeId") ?? undefined;
    const mine = url.searchParams.get("mine");
    const profile = url.searchParams.get("profile");

    const filters: Parameters<typeof listReports>[0] = { placeId };
    if (mine) filters.mine = validateBooleanLike(mine);
    if (profile && isAffectedProfile(profile)) filters.profile = profile;
    if (filters.mine) {
      const session = await getCurrentUser();
      filters.authorId = session?.id ?? undefined;
      if (!session) {
        return ok({ reports: [] as never[], source: "demo" });
      }
    }

    const { data, source } = await listReports(filters);
    return ok({ reports: data, source });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    const ip = clientIp(request);
    const rate = checkRateLimit(rateLimitKey(ip, "reports"), 8, 60_000);
    if (!rate.allowed) {
      throw new ApiError(429, "RATE_LIMITED", `Terlalu banyak laporan. Coba lagi dalam ${rate.retryAfterSeconds} detik.`);
    }

    let body: Partial<SubmitReportInput>;
    try {
      body = (await request.json()) as Partial<SubmitReportInput>;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    if (!body.category || !isReportCategory(body.category)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Pilih kategori yang tersedia.", { category: body.category });
    }
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length < 10 || description.length > 2000) {
      throw new ApiError(422, "VALIDATION_ERROR", "Deskripsi minimal 10 karakter dan maksimal 2000 karakter.");
    }
    const affectedProfiles = Array.isArray(body.affectedProfiles) ? body.affectedProfiles : [];
    if (affectedProfiles.length === 0 || !affectedProfiles.every(isAffectedProfile)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Pilih siapa yang terdampak.");
    }
    const severity = body.severity && SEVERITIES.includes(body.severity) ? body.severity : "MEDIUM";
    const aiSuggested = body.aiSuggested === true;

    const media: SubmitReportInput["media"] = [];
    if (Array.isArray(body.media)) {
      if (body.media.length > 3) {
        throw new ApiError(422, "VALIDATION_ERROR", "Maksimal 3 foto per laporan.");
      }
      for (const item of body.media) {
        if (!item || item.kind !== "photo" || typeof item.url !== "string") {
          throw new ApiError(422, "VALIDATION_ERROR", "Data media tidak valid.");
        }
        const check = validatePhotoDataUrl(item.url);
        if (!check.ok) {
          throw new ApiError(422, "UPLOAD_FAILED", check.error ?? "Upload foto gagal.", { media: item });
        }
        media.push({
          kind: "photo",
          url: item.url,
          caption: typeof item.caption === "string" && item.caption.length > 0 ? item.caption : null,
        });
      }
    }

    const input: SubmitReportInput = {
      category: body.category,
      description,
      severity,
      affectedProfiles: affectedProfiles as AffectedProfile[],
      placeId: typeof body.placeId === "string" ? body.placeId : null,
      address: typeof body.address === "string" ? body.address : null,
      latitude: typeof body.latitude === "number" && Number.isFinite(body.latitude) ? body.latitude : null,
      longitude: typeof body.longitude === "number" && Number.isFinite(body.longitude) ? body.longitude : null,
      media,
      aiSuggested,
      reporterId: typeof body.reporterId === "string" && body.reporterId ? body.reporterId : null,
      reporterName: typeof body.reporterName === "string" && body.reporterName ? body.reporterName : null,
    };

    const { data, source } = await createReport(input, session);
    const gamification = awardReportPoints(
      input.reporterId ?? `anon-${ip}`,
      input.reporterName ?? null,
      { category: input.category, severity: input.severity, hasPhoto: media.length > 0 },
    );
    return ok(
      { report: { ...data, categoryLabel: reportCategoryLabel(data.category) }, source, gamification },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}