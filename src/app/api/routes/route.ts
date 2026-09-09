import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { checkRateLimit, clientIp, rateLimitKey } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { findDemoPlace, planRoutes } from "@/lib/data/route-engine";
import type { AccessibilityProfileType, LatLng } from "@/types";

function isProfile(value: unknown): value is AccessibilityProfileType {
  return value === "VISUAL_NAVIGATION" || value === "WHEELCHAIR_MOBILITY";
}

function isLatLng(value: unknown): value is LatLng {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { lat?: unknown; lng?: unknown };
  return (
    typeof candidate.lat === "number" &&
    Number.isFinite(candidate.lat) &&
    Math.abs(candidate.lat) <= 90 &&
    typeof candidate.lng === "number" &&
    Number.isFinite(candidate.lng) &&
    Math.abs(candidate.lng) <= 180
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = checkRateLimit(rateLimitKey(ip, "routes"), 20, 60_000);
    if (!rate.allowed) {
      throw new ApiError(429, "RATE_LIMITED", `Terlalu banyak permintaan rute. Coba lagi dalam ${rate.retryAfterSeconds} detik.`);
    }

    let body: { origin?: unknown; originName?: unknown; destinationId?: unknown; profile?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ApiError(400, "INVALID_JSON", "Badan permintaan harus berupa JSON.");
    }

    if (!isProfile(body.profile)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Profil aksesibilitas tidak valid.");
    }
    if (!isLatLng(body.origin)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Lokasi asal tidak valid.");
    }
    if (typeof body.destinationId !== "string" || body.destinationId.length === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Tujuan tidak valid.");
    }

    const destination = findDemoPlace(body.destinationId);
    if (!destination) {
      throw new ApiError(404, "NOT_FOUND", "Rute belum dapat dibuat untuk lokasi ini. Silakan coba lokasi lain.");
    }

    const originName =
      typeof body.originName === "string" && body.originName.length > 0 ? body.originName.trim() : "Lokasiku";

    const { routes, source } = planRoutes(body.origin, originName, destination, body.profile);
    return ok({ routes, source });
  } catch (error) {
    return handleApiError(error);
  }
}