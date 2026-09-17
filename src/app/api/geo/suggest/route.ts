import { handleApiError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getPlaces } from "@/lib/data/places";
import { toSummary } from "@/lib/data/places-core";
import { demoPlaces } from "@/lib/data/demo-data";
import { haversineKm, isOutsideFocus, type LatLng } from "@/lib/geo";
import type { PlaceSummary } from "@/types";

export interface GeoSuggestion {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
  kind: "place" | "poi" | "street" | "city" | "area";
  icon: string;
  place?: PlaceSummary;
}

interface NominatimResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  lat: string;
  lon: string;
  display_name: string;
  category?: string;
  type?: string;
  address?: {
    amenity?: string;
    shop?: string;
    tourism?: string;
    leisure?: string;
    railway?: string;
    highway?: string;
    building?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

function kindFromRemote(category?: string, type?: string): GeoSuggestion["kind"] {
  if (category === "highway" || type === "road" || type === "residential") return "street";
  if (category === "place") return "city";
  if (category === "building") return "poi";
  return "poi";
}

function iconFor(kind: GeoSuggestion["kind"], category?: string): string {
  if (category && /(amenity|shop|tourism|leisure|office)/.test(category)) return "📍";
  if (kind === "street") return "🛣️";
  if (kind === "city") return "🏙️";
  if (kind === "area") return "🗺️";
  return "📍";
}

function subtitleFromRemote(r: NominatimResult): string {
  const a = r.address;
  if (a) {
    const bits = [
      a.amenity ?? a.shop ?? a.tourism ?? a.leisure ?? a.railway ?? a.highway ?? a.road,
      a.city ?? a.town ?? a.village,
      a.state,
      a.country,
    ].filter(Boolean);
    return bits.join(", ");
  }
  const parts = r.display_name.split(",");
  return parts.slice(1).join(",").trim();
}

function nameFromRemote(r: NominatimResult): string {
  const a = r.address;
  const specific = a?.amenity ?? a?.shop ?? a?.tourism ?? a?.leisure ?? a?.railway ?? a?.highway ?? a?.road;
  if (specific) return specific;
  const first = r.display_name.split(",")[0]?.trim();
  return first || r.display_name;
}

/** Skor aksesibilitas dari tempat terdekat yang sudah dianalisis (dalam radius maxKm). */
function analyzedNear(lat: number, lng: number, maxKm = 1.2): PlaceSummary | null {
  let best: { p: (typeof demoPlaces)[number]; d: number } | null = null;
  for (const p of demoPlaces) {
    const d = haversineKm({ lat, lng }, p);
    if (d <= maxKm && (!best || d < best.d)) best = { p, d };
  }
  return best ? toSummary(best.p, null) : null;
}

function scoreSuffix(place: Pick<PlaceSummary, "score"> | null): string {
  if (!place?.score) return "";
  const value = place.score.visual ?? place.score.mobility;
  if (value == null) return "";
  return `Skor ${value}`;
}

async function fetchRemoteSuggestions(q: string, origin: LatLng | null): Promise<GeoSuggestion[]> {
  try {
    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      limit: "8",
      addressdetails: "1",
      "accept-language": "id",
      countrycodes: "id",
      bounded: "1",
    });
    // Fokus Jakarta Timur: batasi hasil geocode ke area kota tersebut (plus sedikit bantalan).
    const inFocus = origin && !isOutsideFocus(origin);
    if (inFocus) {
      params.set("viewbox", `${origin.lng - 0.1},${origin.lat + 0.1},${origin.lng + 0.1},${origin.lat - 0.1}`);
    } else {
      params.set("viewbox", "106.79,-6.34,106.99,-6.10");
    }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "ANAPSI-web/1.0 (accessibility navigation demo)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4500),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const results = (await response.json()) as NominatimResult[];
    return results
      .filter((r) => r.lat && r.lon)
      .map((r) => {
        const kind = kindFromRemote(r.category, r.type);
        return {
          id: `geo-${r.osm_type}-${r.osm_id}`,
          name: nameFromRemote(r),
          subtitle: subtitleFromRemote(r),
          lat: Number(r.lat),
          lng: Number(r.lon),
          kind,
          icon: iconFor(kind, r.category),
        };
      });
  } catch {
    return [];
  }
}

export function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const lat = Number(url.searchParams.get("lat") ?? NaN);
    const lng = Number(url.searchParams.get("lng") ?? NaN);
    const origin: LatLng | null = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

    return (async () => {
      // Rekomendasi di sekitar saat kolom kosong (mecam "rekomendasi" di Google Maps).
      if (q.length === 0) {
        const local = await getPlaces({ origin, radiusKm: 3 });
        const suggestions: GeoSuggestion[] = local.data.slice(0, 6).map((p) => ({
          id: `place-${p.id}`,
          name: p.name,
          subtitle: [p.category, p.address, p.distanceLabel, scoreSuffix(p)].filter(Boolean).join(" · "),
          lat: p.lat,
          lng: p.lng,
          kind: p.category ? "place" : "poi",
          icon: "📍",
          place: p,
        }));
        return ok({ suggestions, source: "recommendations" });
      }

      // Cari simultan: data lokal ANAPSI + geocode global (jalan/kota/dll).
      const [local, remote] = await Promise.all([
        getPlaces({ q, origin, radiusKm: 10 }),
        q.length >= 2 ? fetchRemoteSuggestions(q, origin) : Promise.resolve([] as GeoSuggestion[]),
      ]);

      const seen = new Set<string>();
      const suggestions: GeoSuggestion[] = [];
      for (const p of local.data.slice(0, 5)) {
        const key = p.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push({
          id: `place-${p.id}`,
          name: p.name,
          subtitle: [p.category, p.address, p.distanceLabel, scoreSuffix(p)].filter(Boolean).join(" · "),
          lat: p.lat,
          lng: p.lng,
          kind: "place",
          icon: "📍",
          place: p,
        });
      }
      for (const r of remote) {
        const key = r.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const analyzed = analyzedNear(r.lat, r.lng);
        suggestions.push({
          ...r,
          subtitle: [r.subtitle, scoreSuffix(analyzed)].filter(Boolean).join(" · "),
          place: analyzed ?? undefined,
        });
      }
      return ok({ suggestions, source: "suggestions" });
    })();
  } catch (error) {
    return handleApiError(error);
  }
}