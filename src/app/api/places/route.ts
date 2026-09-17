import { handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getPlaces } from "@/lib/data/places";
import type { LatLng } from "@/lib/geo";

interface SearchParams {
  q?: string;
  lat?: string;
  lng?: string;
  radiusKm?: string;
}

export function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params: SearchParams = {
      q: url.searchParams.get("q") ?? undefined,
      lat: url.searchParams.get("lat") ?? undefined,
      lng: url.searchParams.get("lng") ?? undefined,
      radiusKm: url.searchParams.get("radiusKm") ?? undefined,
    };

    const lat = params.lat !== undefined ? Number(params.lat) : NaN;
    const lng = params.lng !== undefined ? Number(params.lng) : NaN;
    const origin: LatLng | null = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    const radiusKm = params.radiusKm !== undefined ? Number(params.radiusKm) : undefined;

    return getPlaces({ q: params.q, origin, radiusKm: Number.isFinite(radiusKm ?? 0) ? radiusKm : 3 }).then(
      ({ data, source }) => ok({ places: data, source }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}