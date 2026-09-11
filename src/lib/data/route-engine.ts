import { demoMapFeatures, demoPlaces, type DemoFeature, type DemoPlace } from "@/lib/data/demo-data";
import { LAYERS, layersForProfile, statusMeta, type LayerKind } from "@/lib/data/layers";
import { formatDistance, haversineKm, type LatLng } from "@/lib/geo";
import { scoreLabel } from "@/lib/scoring";
import type { AccessibilityProfileType, RouteBarrierInfo, RouteFacilityInfo, RouteOption, RouteStepInfo } from "@/types";

const CORRIDOR_RADIUS_M = 120;
const LEG_LENGTH_M = 80;
const DETOUR_OFFSET_M = 70;

const SPEED_KMH: Record<AccessibilityProfileType, number> = {
  WHEELCHAIR_MOBILITY: 4.5,
  VISUAL_NAVIGATION: 5,
};

export interface RoutePlanResult {
  routes: RouteOption[];
  source: string;
}

interface CorridorHit {
  feature: DemoFeature;
  alongMeters: number;
  nearestMeters: number;
}

interface RouteLike {
  points: LatLng[];
  hits: CorridorHit[];
}

interface Stroke {
  kind: LayerKind;
  status: string;
  distanceMeters: number;
  verification: string;
}

export function metersBetween(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * 1000;
}

/** Titik proyeksi segmen AB ke titik P; mengembalikan jarak tegak lurus & jarak sepanjang garis. */
function projectOnSegment(p: LatLng, a: LatLng, b: LatLng): { nearest: number; along: number } {
  const abx = b.lng - a.lng;
  const aby = b.lat - a.lat;
  const apsx = p.lng - a.lng;
  const apsy = p.lat - a.lat;
  const denom = abx * abx + aby * aby;
  let t = denom > 0 ? (apsx * abx + apsy * aby) / denom : 0;
  t = Math.max(0, Math.min(1, t));
  const proj: LatLng = { lng: a.lng + t * abx, lat: a.lat + t * aby };
  return { nearest: metersBetween(p, proj), along: t * metersBetween(a, b) };
}

function subdivide(a: LatLng, b: LatLng, maxLegM: number): LatLng[] {
  const total = metersBetween(a, b);
  const count = Math.max(1, Math.ceil(total / maxLegM));
  const points: LatLng[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    points.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
  }
  points.push(b);
  return points;
}

export function corridorHits(points: LatLng[], kinds: LayerKind[]): CorridorHit[] {
  const hits: CorridorHit[] = [];
  let cum = 0;
  const lengths: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const len = metersBetween(points[i], points[i + 1]);
    lengths.push(len);
    cum += len;
  }
  const total = cum;
  for (const feature of demoMapFeatures) {
    if (!kinds.includes(feature.kind as LayerKind)) continue;
    let best: { nearest: number; along: number } | null = null;
    let cumLeg = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      const seg = projectOnSegment(feature, points[i], points[i + 1]);
      const candidate = { nearest: seg.nearest, along: cumLeg + seg.along };
      if (!best || candidate.nearest < best.nearest) best = candidate;
      cumLeg += lengths[i];
    }
    if (best && best.nearest <= CORRIDOR_RADIUS_M && best.along >= -40 && best.along <= total + 80) {
      hits.push({ feature, alongMeters: best.along, nearestMeters: best.nearest });
    }
  }
  return hits;
}

export function evaluateRoute(
  route: RouteLike,
  destination: DemoPlace,
  profile: AccessibilityProfileType,
  pathPivots: LatLng[],
): { score: number | null; strokes: Stroke[]; facilitiesOf: RouteFacilityInfo[]; barriersOf: RouteBarrierInfo[] } {
  let delta = 0;
  let hitCount = 0;
  const strokeMap = new Map<string, Stroke>();
  const distanceM = sumPath(pathPivots);

  for (const hit of route.hits) {
    const meta = statusMeta(hit.feature.kind as LayerKind, hit.feature.status);
    if (meta.label === "Tidak diketahui") continue;
    const key = `${hit.feature.kind}:${hit.feature.status}:${Math.round(hit.alongMeters / 40)}`;
    if (strokeMap.has(key)) continue;
    strokeMap.set(key, {
      kind: hit.feature.kind as LayerKind,
      status: hit.feature.status,
      distanceMeters: Math.max(10, Math.round(hit.alongMeters)),
      verification: hit.feature.verification,
    });
    if (meta.tone === "danger") delta -= 2.2;
    else if (meta.tone === "warning") delta -= 1.1;
    else if (meta.tone === "success") delta += 1.3;
    else delta += 0;
    hitCount += 1;
  }

  const recommendedEntrance = destination.entrances.find(
    (e) => e.hasRamp || e.type === "MAIN",
  ) ?? destination.entrances[0];
  if (recommendedEntrance) {
    if (recommendedEntrance.hasRamp) delta += 0.8;
    if (recommendedEntrance.steps > 0 && !recommendedEntrance.hasRamp) delta -= 1;
  }

  const score = hitCount > 0 || recommendedEntrance ? Math.max(0, Math.min(100, Math.round(50 + delta))) : null;

  const strokes = [...strokeMap.values()];
  const barriers: RouteBarrierInfo[] = [];
  const facilities: RouteFacilityInfo[] = [];
  for (const stroke of strokes) {
    if (stroke.kind === "accessible_entrance" && stroke.distanceMeters > distanceM * 0.85) continue;
    const meta = statusMeta(stroke.kind, stroke.status);
    if (meta.tone === "success") {
      facilities.push({
        id: `${stroke.kind}-${stroke.status}-${stroke.distanceMeters}`,
        kind: stroke.kind,
        label: `${LAYERS[stroke.kind].label}: ${meta.label}`,
        symbol: meta.symbol,
        tone: "success",
        distanceMeters: stroke.distanceMeters,
      });
    } else if (meta.tone !== "neutral") {
      barriers.push({
        id: `${stroke.kind}-${stroke.status}-${stroke.distanceMeters}`,
        kind: stroke.kind,
        label: `${LAYERS[stroke.kind].label}: ${meta.label}`,
        symbol: meta.symbol,
        tone: meta.tone === "danger" ? "danger" : "warning",
        distanceMeters: stroke.distanceMeters,
        verification: stroke.verification as RouteBarrierInfo["verification"],
      });
    }
  }

  if (recommendedEntrance && destination.entrances.length > 0) {
    facilities.push({
      id: `entrance-${recommendedEntrance.id}`,
      kind: "accessible_entrance",
      label: `Pintu masuk rekomendasi di tujuan: ${recommendedEntrance.name}`,
      symbol: recommendedEntrance.hasRamp ? "↘" : "⚠",
      tone: recommendedEntrance.hasRamp ? "success" : "warning",
      distanceMeters: Math.round(distanceM),
    });
  }

  return { score, strokes, facilitiesOf: facilities, barriersOf: barriers };
}

export function buildSteps(
  pivots: LatLng[],
  destinationName: string,
): RouteStepInfo[] {
  const steps: RouteStepInfo[] = [];
  for (let i = 0; i < pivots.length - 1; i += 1) {
    const d = Math.round(metersBetween(pivots[i], pivots[i + 1]));
    steps.push({
      id: `step-${i}`,
      instruction: i === 0 ? `Berjalan menuju ${destinationName} sejauh ${d} meter.` : `Lanjut ${d} meter.`,
      distanceMeters: d,
      barrierLabel: null,
      facilityLabel: null,
    });
  }
  steps.push({
    id: `step-arrive`,
    instruction: `Tiba di ${destinationName}.`,
    distanceMeters: 0,
    barrierLabel: null,
    facilityLabel: null,
    isArrival: true,
  });
  return steps;
}

export function withWarnings(steps: RouteStepInfo[], barriers: RouteBarrierInfo[], facilities: RouteFacilityInfo[]): RouteStepInfo[] {
  let untilNow = 0;
  return steps.map((step) => {
    const from = untilNow - 20;
    const to = untilNow + step.distanceMeters + 30;
    untilNow += step.distanceMeters;
    const barrier = barriers.find((b) => b.distanceMeters >= from && b.distanceMeters <= to);
    const facility = facilities.find((f) => f.distanceMeters >= from && f.distanceMeters <= to);
    const next = { ...step };
    if (step.isArrival) return next;
    if (barrier) {
      next.barrierLabel = `${barrier.symbol ?? "⚠"} ${barrier.label} dilaporkan sekitar ${Math.max(0, Math.round(barrier.distanceMeters - from))} m dari posisi saat ini.`;
    }
    if (facility && !barrier) {
      next.facilityLabel = `${facility.symbol ?? "✓"} ${facility.label}.`;
    }
    return next;
  });
}

function honestNote(): string | null {
  return "Accessibility-informed route based on currently available community data.";
}

export function planRoutes(
  origin: LatLng,
  originName: string,
  destination: DemoPlace,
  profile: AccessibilityProfileType,
): RoutePlanResult {
  const kinds = layersForProfile(profile) as LayerKind[];

  const dest: LatLng = { lat: destination.lat, lng: destination.lng };

  const fastPoints = subdivide(origin, dest, LEG_LENGTH_M);
  const fastHits = corridorHits(fastPoints, kinds);
  const fastLike: RouteLike = { points: fastPoints, hits: fastHits };

  const accessiblePivots: LatLng[] = [origin];
  const sortedFastHits = [...fastHits].sort((a, b) => a.alongMeters - b.alongMeters);
  for (const hit of sortedFastHits) {
    const meta = statusMeta(hit.feature.kind as LayerKind, hit.feature.status);
    if (meta.tone !== "danger") continue;
    const midpoint = destPointAt(origin, dest, hit.alongMeters / metersBetween(origin, dest));
    const offset = perpendicularOffsetFastest(origin, dest, midpoint, DETOUR_OFFSET_M);
    const last = accessiblePivots[accessiblePivots.length - 1];
    if (metersBetween(last, offset) < 25) continue;
    accessiblePivots.push(offset);
  }
  if (metersBetween(accessiblePivots[accessiblePivots.length - 1], dest) > 25) {
    accessiblePivots.push(dest);
  }

  const accessiblePoints: LatLng[] = [];
  for (let i = 0; i < accessiblePivots.length - 1; i += 1) {
    accessiblePoints.push(...subdivide(accessiblePivots[i], accessiblePivots[i + 1], LEG_LENGTH_M).slice(0, -1));
  }
  accessiblePoints.push(dest);
  const accessibleHits = corridorHits(accessiblePoints, kinds);
  const accessibleLike: RouteLike = { points: accessiblePoints, hits: accessibleHits };

  const fastEval = evaluateRoute(fastLike, destination, profile, [origin, dest]);
  const accessibleEval = evaluateRoute(accessibleLike, destination, profile, accessiblePivots);

  const fastTotalM = metersBetween(origin, dest);
  const accessibleTotalM = sumPath(accessiblePivots);

  const speedKmph = SPEED_KMH[profile];
  const durationFor = (meters: number) => Math.max(1, Math.round((meters / 1000) / speedKmph * 60));

  const fastSteps = withWarnings(buildSteps([origin, dest], destination.name), fastEval.barriersOf, fastEval.facilitiesOf);
  const accessibleSteps = withWarnings(buildSteps(accessiblePivots, destination.name), accessibleEval.barriersOf, accessibleEval.facilitiesOf);

  const fastRoute = toOption({
    id: "route-fast",
    label: "Fastest Route",
    fromName: originName,
    toName: destination.name,
    destinationId: destination.id,
    distanceM: fastTotalM,
    durationMinutes: durationFor(fastTotalM),
    score: fastEval.score,
    reasoning: [...(fastEval.score !== null ? [`Rute tercepat berdasarkan data aksesibilitas yang tersedia.`] : []), "Dihitung dari estimator demo."],
    warnings: fastEval.barriersOf.slice(0, 3).map((b) => `${b.label} dilaporkan sekitar ${b.distanceMeters} m dari awal.`),
    barriersOf: fastEval.barriersOf,
    facilitiesOf: fastEval.facilitiesOf,
    steps: fastSteps,
    geometry: fastPoints,
  });

  const accessibleReasoning = [
    ...(accessibleEval.barriersOf.length > 0 ? [`Menghindari ${accessibleEval.barriersOf.length} hambatan yang dilaporkan komunitas.`] : []),
    ...(accessibleEval.facilitiesOf.length > 0 ? [`Termasuk ${accessibleEval.facilitiesOf.length} fasilitas aksesibel di sepanjang rute.`] : []),
  ];
  const accessibleRoute = toOption({
    id: "route-maj",
    label: "Most Accessible Route",
    fromName: originName,
    toName: destination.name,
    destinationId: destination.id,
    distanceM: accessibleTotalM,
    durationMinutes: durationFor(accessibleTotalM),
    score: accessibleEval.score,
    reasoning: accessibleReasoning.length > 0 ? accessibleReasoning : ["Rute ini sedapat mungkin menghindari hambatan yang dilaporkan."],
    warnings: accessibleEval.barriersOf.slice(0, 3).map((b) => `${b.label} dilaporkan sekitar ${b.distanceMeters} m dari awal.`),
    barriersOf: accessibleEval.barriersOf,
    facilitiesOf: accessibleEval.facilitiesOf,
    steps: accessibleSteps,
    geometry: accessiblePoints,
  });

  const recommended = (accessibleEval.score ?? -1) >= (fastEval.score ?? -1) ? accessibleRoute : fastRoute;
  const alternative = recommended === accessibleRoute ? fastRoute : accessibleRoute;
  const routes = [recommended, alternative].map((r) => ({ ...r, recommended: r === recommended }));

  return { routes, source: "demo" };
}

function toOption(input: {
  id: string;
  label: "Most Accessible Route" | "Fastest Route";
  fromName: string;
  toName: string;
  destinationId: string;
  distanceM: number;
  durationMinutes: number;
  score: number | null;
  reasoning: string[];
  warnings: string[];
  barriersOf: RouteBarrierInfo[];
  facilitiesOf: RouteFacilityInfo[];
  steps: RouteStepInfo[];
  geometry: LatLng[];
}): RouteOption {
  return {
    id: input.id,
    label: input.label,
    fromName: input.fromName,
    toName: input.toName,
    destinationId: input.destinationId,
    recommended: false,
    distanceKm: input.distanceM / 1000,
    distanceLabel: formatDistance(input.distanceM / 1000),
    durationMinutes: input.durationMinutes,
    durationLabel: `${input.durationMinutes} menit`,
    accessibilityScore: input.score,
    scoreLabel: scoreLabel(input.score),
    reasoning: input.reasoning,
    warnings: input.warnings,
    barriers: input.barriersOf,
    facilities: input.facilitiesOf,
    steps: input.steps,
    geometry: input.geometry,
    honestNote: honestNote(),
  };
}

export function sumPath(points: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) total += metersBetween(points[i], points[i + 1]);
  return total;
}

function destPointAt(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}

function perpendicularOffsetFastest(a: LatLng, b: LatLng, at: LatLng, offsetMeters: number): LatLng {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const len = Math.hypot(dx, dy) || 1;
  const ux = -dy / len;
  const uy = dx / len;
  const degLng = offsetMeters / 111_320;
  const degLat = offsetMeters / 110_574;
  const side = currentSide();
  return {
    lng: at.lng + ux * degLng * side,
    lat: at.lat + uy * degLat * side,
  };
}

let sideSign = 1;
function currentSide(): number {
  sideSign = -sideSign;
  return sideSign;
}

export function findDemoPlace(id: string): DemoPlace | undefined {
  return demoPlaces.find((p) => p.id === id);
}