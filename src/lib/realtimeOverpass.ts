import type { LatLng, MapFeatureReturn, MapLineFeature } from "@/types";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const GUIDING_TAGS = /^(yes|guided|correct|no|incorrect|limited)$/;

export interface OverpassElement {
  type?: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

function toneForTactile(tactile: string | undefined): MapLineFeature["tone"] {
  if (tactile === "yes" || tactile === "guided" || tactile === "correct") return "success";
  return "warning";
}

/**
 * Garis pandu tunanetra (guiding block / tactile paving) dari OpenStreetMap,
 * dikembalikan sebagai polylines untuk di-gambar di atas peta.
 */
export async function fetchGuidingLines(bbox: string): Promise<MapLineFeature[]> {
  const query = `[out:json][timeout:20];(
way["highway"~"footway|pedestrian|path|service"]["tactile_paving"]( ${bbox} );
way["tactile_paving"]["tactile_paving"~"yes|guided|correct|no|incorrect|limited"]( ${bbox} );
);out geom 240;`;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const els = (json.elements ?? []).filter((el) => el.type === "way");
      const lines: MapLineFeature[] = [];
      for (const el of els) {
        const geom = el.geometry ?? [];
        if (geom.length < 2) continue;
        const tactile = el.tags?.tactile_paving;
        if (!tactile || !GUIDING_TAGS.test(tactile)) continue;
        lines.push({
          id: `osm-line-${el.id}`,
          kind: "guiding_block",
          label:
            tactile === "yes" || tactile === "guided" || tactile === "correct"
              ? "Guiding block / garis pemandu tunanetra"
              : `Tactile paving: ${tactile}`,
          tone: toneForTactile(tactile),
          points: geom.map((g) => ({ lat: g.lat, lng: g.lon })),
          verification: "COMMUNITY_REPORTED",
        });
      }
      if (lines.length > 0) return lines;
    } catch {
      continue;
    }
  }
  return [];
}

export async function fetchRealtimeAccessibility(bbox: string): Promise<MapFeatureReturn[]> {
  const query = `[out:json][timeout:12];(node["wheelchair"]( ${bbox});node["tactile_paving"]( ${bbox});node["amenity"="toilets"]["wheelchair"]( ${bbox});way["highway"="footway"]["tactile_paving"]( ${bbox});node["barrier"]( ${bbox}););out 60;`;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent(query)}` });
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: { id: number; lat: number; lon: number; tags?: Record<string,string> }[] };
      const els = json.elements ?? [];
      return els.slice(0, 60).map((el, i) => {
        const tags = el.tags ?? {};
        const wheelchair = tags.wheelchair;
        const tactile = tags.tactile_paving;
        let tone: MapFeatureReturn["tone"] = "neutral";
        let label = "Data OSM";
        let symbol = "•";
        let kind: MapFeatureReturn["kind"] = "obstacle";
        if (wheelchair === "yes") { tone = "success"; label = "Akses kursi roda tersedia"; symbol = "♿"; kind = "accessible_entrance"; }
        else if (wheelchair === "no" || wheelchair === "limited") { tone = "danger"; label = "Akses kursi roda terbatas"; symbol = "⛔"; kind = "accessible_entrance"; }
        else if (tactile) { tone = tactile === "yes" ? "success" : "warning"; label = tactile === "yes" ? "Guiding block tersedia" : "Guiding block terbatas"; symbol = "▮"; kind = "guiding_block"; }
        else if (tags.barrier) { tone = "danger"; label = `Hambatan: ${tags.barrier}`; symbol = "🚧"; }
        return { id: `osm-${el.id}-${i}`, kind, status: wheelchair ?? tactile ?? tags.barrier ?? "unknown", symbol, label, statusLabel: label, tone, lat: el.lat, lng: el.lon, placeId: null, placeName: tags.name ?? null, verification: "COMMUNITY_REPORTED" as const, stepCount: null } as MapFeatureReturn;
      });
    } catch { continue; }
  }
  return [];
}

export function bboxFromCenter(lat: number, lng: number, delta = 0.015): string {
  return `${(lat - delta).toFixed(5)},${(lng - delta).toFixed(5)},${(lat + delta).toFixed(5)},${(lng + delta).toFixed(5)}`;
}

export function bboxFromPolyline(points: LatLng[], pad = 0.008): string {
  if (points.length === 0) {
    return bboxFromCenter(-6.2003, 106.877);
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return `${(minLat - pad).toFixed(5)},${(minLng - pad).toFixed(5)},${(maxLat + pad).toFixed(5)},${(maxLng + pad).toFixed(5)}`;
}
