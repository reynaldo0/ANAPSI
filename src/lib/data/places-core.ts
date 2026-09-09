import { statusMeta } from "@/lib/data/layers";
import {
  demoMapFeatures,
  demoPlaces,
  demoReports,
  type DemoFeature,
  type DemoPlace,
} from "@/lib/data/demo-data";
import { haversineKm, distanceFrom, type LatLng } from "@/lib/geo";
import { evaluateAccessibility, type FeatureEvidence } from "@/lib/scoring";
import type {
  AccessibilityProfileType,
  EntranceInfo,
  MapFeatureReturn,
  PlaceDetail,
  PlaceSummary,
  ReportStub,
  ReportStatus,
} from "@/types";

export interface PlacesQuery {
  q?: string;
  origin?: LatLng | null;
  radiusKm?: number;
}

export interface DataResponse<T> {
  data: T;
  source: string;
}

export function linkedFeaturesFor(place: DemoPlace): FeatureEvidence[] {
  return demoMapFeatures.filter((f) => f.placeId === place.id);
}

export function freshnessForPlace(place: DemoPlace): string {
  const dates = demoReports
    .filter((r) => r.placeId === place.id)
    .map((r) => r.createdAt)
    .sort()
    .reverse();
  return dates.length > 0 ? `Diperbarui komunitas ${dates[0]} (demo)` : "Belum ada pembaruan data";
}

export function placeScores(place: DemoPlace): { visual: number | null; mobility: number | null } {
  const features = linkedFeaturesFor(place);
  const entrances = place.entrances;
  return {
    visual: evaluateAccessibility({
      profile: "VISUAL_NAVIGATION",
      entrances,
      features,
      freshness: freshnessForPlace(place),
    }).score,
    mobility: evaluateAccessibility({
      profile: "WHEELCHAIR_MOBILITY",
      entrances,
      features,
      freshness: freshnessForPlace(place),
    }).score,
  };
}

export function placeEvaluation(place: DemoPlace, profile: AccessibilityProfileType): ReturnType<typeof evaluateAccessibility> {
  return evaluateAccessibility({
    profile,
    entrances: place.entrances,
    features: linkedFeaturesFor(place),
    freshness: freshnessForPlace(place),
  });
}

export function toSummary(place: DemoPlace, origin: LatLng | null): PlaceSummary {
  const distance = distanceFrom(origin, place);
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    city: place.city,
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    score: placeScores(place),
    distanceLabel: distance?.label,
    distanceKm: distance?.km,
  };
}

export function demoPlacesFiltered(query: PlacesQuery, origin: LatLng | null): DemoPlace[] {
  const q = query.q?.trim().toLowerCase();
  const radiusKm = query.radiusKm ?? 3;
  return demoPlaces
    .filter((place) => {
      if (q) {
        const haystack = `${place.name} ${place.address} ${place.city} ${place.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (origin && haversineKm(origin, place) > radiusKm) return false;
      return true;
    })
    .sort((a, b) => {
      if (origin) return haversineKm(origin, a) - haversineKm(origin, b);
      return a.name.localeCompare(b.name);
    });
}

function scoreToLabel(score: number): string {
  if (score >= 80) return "Sangat Aksesibel";
  if (score >= 60) return "Aksesibel Sebagian";
  if (score >= 40) return "Aksesibilitas Terbatas";
  return "Hambatan Signifikan";
}

export function summaryScore(
  place: PlaceSummary | { score: { visual: number | null; mobility: number | null } | null },
  profile: AccessibilityProfileType | null,
): { score: number | null; label: string } {
  const value = profile === "WHEELCHAIR_MOBILITY" ? place.score?.mobility : place.score?.visual;
  return value == null ? { score: null, label: "Belum dinilai" } : { score: value, label: scoreToLabel(value) };
}

export function formatEntrance(entrance: {
  steps: number;
  hasRamp: boolean;
  widthCm: number | null;
  notes: string | null;
}): Pick<EntranceInfo, "formattedSteps" | "formattedWidth" | "recommended"> {
  const formattedSteps = entrance.steps === 0 ? "Tanpa tangga" : `${entrance.steps} anak tangga`;
  const formattedWidth = entrance.widthCm ? `${entrance.widthCm} cm` : "Belum diukur";
  const recommended = entrance.steps === 0 || (entrance.hasRamp && entrance.steps <= 2);
  return { formattedSteps, formattedWidth, recommended };
}

function demoEntranceToInfo(entrance: DemoPlace["entrances"][number]): EntranceInfo {
  const shared = formatEntrance(entrance);
  return {
    id: entrance.id,
    name: entrance.name,
    type: entrance.type,
    steps: entrance.steps,
    hasRamp: entrance.hasRamp,
    widthCm: entrance.widthCm,
    notes: entrance.notes,
    ...shared,
  };
}

export function demoPlaceToDetail(place: DemoPlace, profile: AccessibilityProfileType | null): PlaceDetail {
  const scores = placeScores(place);
  return {
    summary: toSummary(place, null),
    description: place.description,
    score: scores,
    factors: profile ? placeEvaluation(place, profile).factors : [],
    entrances: place.entrances.map(demoEntranceToInfo),
    reports: demoReports
      .filter((r) => r.placeId === place.id)
      .map((r) => toReportStub(r)),
    freshness: freshnessForPlace(place),
  };
}

function toReportStub(report: (typeof demoReports)[number]): ReportStub {
  return {
    id: report.id,
    title: report.title,
    excerpt: report.excerpt,
    status: report.status as ReportStatus,
    verification: report.verification,
    authorName: report.authorName,
    createdAt: report.createdAt,
    agree: report.agree,
    disagree: report.disagree,
  };
}

function toFeature(feature: DemoFeature): MapFeatureReturn {
  const meta = statusMeta(feature.kind, feature.status);
  const place = feature.placeId ? demoPlaces.find((p) => p.id === feature.placeId) : undefined;
  return {
    id: feature.id,
    kind: feature.kind,
    status: feature.status,
    symbol: meta.symbol,
    label: feature.stepCount ? `${meta.label} (${feature.stepCount} anak tangga)` : meta.label,
    statusLabel: meta.label,
    tone: meta.tone,
    lat: feature.lat,
    lng: feature.lng,
    placeId: feature.placeId ?? null,
    placeName: place?.name ?? null,
    verification: feature.verification,
    stepCount: feature.stepCount ?? null,
  };
}

export function mockFeatures(profile: AccessibilityProfileType, origin: LatLng | null): MapFeatureReturn[] {
  const kinds =
    profile === "WHEELCHAIR_MOBILITY"
      ? ["ramp", "stairs", "elevator", "path_width", "surface_condition", "accessible_entrance"]
      : ["guiding_block", "pedestrian_crossing", "audio_crossing_signal", "obstacle", "surface_hazard"];
  return demoMapFeatures
    .filter((f) => kinds.includes(f.kind))
    .map((f) => ({ f, d: origin ? haversineKm(origin, f) : 0 }))
    .sort((a, b) => a.d - b.d)
    .map(({ f }) => toFeature(f));
}

export function getNearbyReports(): ReportStub[] {
  return demoReports.map(toReportStub);
}