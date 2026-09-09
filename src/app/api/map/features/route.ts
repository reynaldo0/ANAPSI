import { handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getMapFeatures } from "@/lib/data/places";
import { ACCESSIBILITY_PROFILES } from "@/lib/constants";
import type { AccessibilityProfileType } from "@/types";
import type { LatLng } from "@/lib/geo";

export function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawProfile = url.searchParams.get("profile") ?? "";
    const profile: AccessibilityProfileType = ACCESSIBILITY_PROFILES.some(
      (p) => p.value === rawProfile,
    )
      ? (rawProfile as AccessibilityProfileType)
      : "VISUAL_NAVIGATION";

    const lat = Number(url.searchParams.get("lat") ?? NaN);
    const lng = Number(url.searchParams.get("lng") ?? NaN);
    const origin: LatLng | null = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

    return getMapFeatures(profile, origin).then(({ data, source }) =>
      ok({ features: data, source, profile }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}