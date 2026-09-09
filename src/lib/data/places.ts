import { getDb } from "@/lib/db";
import { haversineKm, distanceFrom, type LatLng } from "@/lib/geo";
import { statusMeta, type LayerKind } from "@/lib/data/layers";
import { demoPlaces, DEMO_SOURCE_LABEL } from "@/lib/data/demo-data";
import { toSummary, demoPlacesFiltered, demoPlaceToDetail, formatEntrance, mockFeatures, type PlacesQuery, type DataResponse } from "@/lib/data/places-core";
import type { AccessibilityProfileType, MapFeatureReturn, PlaceDetail, PlaceSummary, VerificationStatus } from "@/types";

export type { PlacesQuery, DataResponse };
export { summaryScore, formatEntrance, demoPlaceToDetail, getNearbyReports } from "@/lib/data/places-core";

export async function getPlaces(query: PlacesQuery): Promise<DataResponse<PlaceSummary[]>> {
  const db = getDb();
  const origin = query.origin ?? null;

  if (!db) {
    return { data: demoPlacesFiltered(query, origin).map((p) => toSummary(p, origin)), source: DEMO_SOURCE_LABEL };
  }

  const q = query.q?.trim();
  const places = await db.place.findMany({
    take: 50,
    orderBy: { name: "asc" },
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { score: true },
  });

  const radiusKm = query.radiusKm ?? 3;
  const asLatLng = (p: { latitude: number; longitude: number }): LatLng => ({ lat: p.latitude, lng: p.longitude });
  const summaries = places
    .filter((p) => !origin || haversineKm(origin, asLatLng(p)) <= radiusKm)
    .sort((a, b) => {
      if (origin) return haversineKm(origin, asLatLng(a)) - haversineKm(origin, asLatLng(b));
      return a.name.localeCompare(b.name);
    })
    .map((p) => {
      const distance = distanceFrom(origin, asLatLng(p));
      return {
        id: p.id,
        name: p.name,
        address: p.address ?? "",
        city: p.city,
        category: p.category,
        lat: p.latitude,
        lng: p.longitude,
        score: p.score ? { visual: p.score.visualValue, mobility: p.score.mobilityValue } : null,
        distanceLabel: distance?.label,
        distanceKm: distance?.km,
      } as PlaceSummary;
    });

  return { data: summaries, source: "database" };
}

export async function getPlaceById(id: string): Promise<DataResponse<PlaceDetail | null>> {
  const db = getDb();
  if (!db) {
    const place = demoPlaces.find((p) => p.id === id);
    return { data: place ? demoPlaceToDetail(place, null) : null, source: DEMO_SOURCE_LABEL };
  }

  const place = await db.place.findUnique({
    where: { id },
    include: { score: true, entrances: true, reports: { include: { author: true } } },
  });
  if (!place) return { data: null, source: "database" };

  const summary: PlaceSummary = {
    id: place.id,
    name: place.name,
    address: place.address ?? "",
    city: place.city,
    category: place.category,
    lat: place.latitude,
    lng: place.longitude,
    score: place.score ? { visual: place.score.visualValue, mobility: place.score.mobilityValue } : null,
  };

  const detail: PlaceDetail = {
    summary,
    description: place.description ?? "",
    score: summary.score,
    factors: [],
    entrances: place.entrances.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      steps: e.stepCount,
      hasRamp: e.hasRamp,
      widthCm: e.widthCm,
      notes: e.notes,
      ...formatEntrance({ steps: e.stepCount, hasRamp: e.hasRamp, widthCm: e.widthCm, notes: e.notes }),
    })),
    reports: place.reports.map((r) => ({
      id: r.id,
      title: r.title,
      excerpt: r.body,
      status: r.status,
      verification: "UNKNOWN" as VerificationStatus,
      authorName: r.author?.displayName ?? "Anonim",
      createdAt: r.createdAt.toISOString().slice(0, 10),
    })),
    freshness: "Data database.",
  };

  return { data: detail, source: "database" };
}

export async function getMapFeatures(
  profile: AccessibilityProfileType,
  origin: LatLng | null,
): Promise<DataResponse<MapFeatureReturn[]>> {
  const db = getDb();
  if (!db) {
    return { data: mockFeatures(profile, origin), source: DEMO_SOURCE_LABEL };
  }

  const mobility = profile === "WHEELCHAIR_MOBILITY";
  const features: MapFeatureReturn[] = [];

  if (mobility) {
    const entrances = await db.entrance.findMany({ orderBy: { placeId: "asc" }, take: 200 });
    for (const entrance of entrances) {
      const accessibility = entrance.stepCount === 0 || entrance.hasRamp;
      const status = accessibility ? "accessible" : entrance.stepCount <= 2 ? "partially_accessible" : "not_accessible";
      const meta = statusMeta("accessible_entrance", status);
      features.push({
        id: `ent-${entrance.id}`,
        kind: "accessible_entrance",
        status,
        symbol: meta.symbol,
        label: meta.label,
        statusLabel: meta.label,
        tone: meta.tone,
        lat: entrance.lat ?? 0,
        lng: entrance.long ?? 0,
        placeId: entrance.placeId,
        placeName: null,
        verification: "UNKNOWN",
        stepCount: entrance.stepCount,
      });
    }
    const withStairs = await db.entrance.findMany({ where: { stepCount: { gt: 0 } }, take: 200 });
    for (const entrance of withStairs) {
      const meta = statusMeta("stairs", "present");
      features.push({
        id: `stairs-${entrance.id}`,
        kind: "stairs",
        status: "present",
        symbol: meta.symbol,
        label: `Tangga (${entrance.stepCount} anak tangga)`,
        statusLabel: meta.label,
        tone: meta.tone,
        lat: entrance.lat ?? 0,
        lng: entrance.long ?? 0,
        placeId: entrance.placeId,
        placeName: null,
        verification: "UNKNOWN",
        stepCount: entrance.stepCount,
      });
    }
    const rampFeatures = await db.accessibilityFeature.findMany({ where: { type: "RAMP" }, take: 200 });
    for (const feature of rampFeatures) {
      const meta = statusMeta("ramp", feature.present ? "available" : "damaged");
      features.push({
        id: `ramp-${feature.id}`,
        kind: "ramp",
        status: feature.present ? "available" : "damaged",
        symbol: meta.symbol,
        label: meta.label,
        statusLabel: meta.label,
        tone: meta.tone,
        lat: 0,
        lng: 0,
        placeId: feature.placeId,
        placeName: null,
        verification: "UNKNOWN",
        stepCount: null,
      });
    }
  } else {
    const tektonik = await db.accessibilityFeature.findMany({
      where: { type: { in: ["TACTILE", "PEDESTRIAN_LIGHT"] } },
      take: 200,
      include: { place: true },
    });
    for (const feature of tektonik) {
      const kind: LayerKind = feature.type === "TACTILE" ? "guiding_block" : "audio_crossing_signal";
      const meta = statusMeta(kind, feature.present ? "available" : "damaged");
      features.push({
        id: `${kind}-${feature.id}`,
        kind,
        status: feature.present ? "available" : "damaged",
        symbol: meta.symbol,
        label: meta.label,
        statusLabel: meta.label,
        tone: meta.tone,
        lat: 0,
        lng: 0,
        placeId: feature.placeId,
        placeName: feature.place.name,
        verification: "UNKNOWN",
        stepCount: null,
      });
    }
  }

  const placeLookup = new Map<string, { lat: number; lng: number; name: string }>();
  const places = await db.place.findMany({ take: 200 });
  for (const p of places) placeLookup.set(p.id, { lat: p.latitude, lng: p.longitude, name: p.name });

  const grounded = features.map((f) => {
    const place = f.placeId ? placeLookup.get(f.placeId) : null;
    const lat = f.lat !== 0 ? f.lat : place?.lat ?? 0;
    const lng = f.lng !== 0 ? f.lng : place?.lng ?? 0;
    return { ...f, lat, lng, placeName: f.placeName ?? place?.name ?? null };
  });

  const sorted = grounded
    .filter((f) => f.lat !== 0 || f.lng !== 0)
    .map((f) => ({ f, d: origin ? haversineKm(origin, f) : 0 }))
    .sort((a, b) => a.d - b.d)
    .map(({ f }) => f);

  return { data: sorted, source: "database" };
}