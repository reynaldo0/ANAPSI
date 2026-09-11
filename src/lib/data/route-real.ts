import type { DemoPlace } from "@/lib/data/demo-data";
import {
  buildSteps,
  corridorHits,
  evaluateRoute,
  metersBetween,
  sumPath,
  withWarnings,
} from "@/lib/data/route-engine";
import { layersForProfile, type LayerKind } from "@/lib/data/layers";
import { formatDistance, type LatLng } from "@/lib/geo";
import { scoreLabel } from "@/lib/scoring";
import type { AccessibilityProfileType, RouteOption } from "@/types";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";
const OSRM_QUERY = "overview=full&geometries=geojson&alternatives=true&continue_straight=false";
const OSRM_TIMEOUT_MS = 8000;
const STEP_STEP_M = 55;
const HIT_STEP_M = 30;

const SPEED_KMH: Record<AccessibilityProfileType, number> = {
  WHEELCHAIR_MOBILITY: 4.5,
  VISUAL_NAVIGATION: 5,
};

interface StreetPlan {
  routes: RouteOption[];
  real: boolean;
}

interface OsrmRoute {
  distance?: number;
  duration?: number;
  geometry?: { type?: string; coordinates: number[][] | number[][][] };
}

interface OsrmBody {
  code: string;
  routes?: OsrmRoute[];
  message?: string;
}

function decimate(points: LatLng[], maxStepM: number): LatLng[] {
  if (points.length < 3) return points;
  const out: LatLng[] = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    acc += metersBetween(points[i - 1], points[i]);
    if (acc >= maxStepM) {
      out.push(points[i]);
      acc = 0;
    }
  }
  const last = points[points.length - 1];
  if (metersBetween(out[out.length - 1], last) > 0.5) out.push(last);
  return out;
}

async function fetchStreetLines(origin: LatLng, destination: LatLng): Promise<LatLng[][] | null> {
  const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?${OSRM_QUERY}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as OsrmBody;
    if (body.code !== "Ok" || !body.routes || body.routes.length === 0) return null;
    const lines: LatLng[][] = [];
    for (const route of body.routes) {
      const raw = route.geometry?.coordinates;
      if (!raw || raw.length < 2) continue;
      const firstElement = raw[0];
      let coords: number[][] | null = null;
      if (
        Array.isArray(firstElement) &&
        typeof firstElement[0] === "number" &&
        typeof firstElement[1] === "number"
      ) {
        coords = raw as number[][];
      } else if (Array.isArray(firstElement) && firstElement.length > 0 && Array.isArray(firstElement[0])) {
        coords = (raw as number[][][])[0] ?? null;
      }
      if (!coords || coords.length < 2) continue;
      const points: LatLng[] = [];
      for (const [lng, lat] of coords) {
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        const point: LatLng = { lat, lng };
        const last = points[points.length - 1];
        if (last && metersBetween(last, point) < 0.5) continue;
        points.push(point);
      }
      if (points.length >= 2) lines.push(points);
    }
    return lines.length > 0 ? lines : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toStreetOption(
  line: LatLng[],
  originName: string,
  destination: DemoPlace,
  profile: AccessibilityProfileType,
  id: string,
  label: "Most Accessible Route" | "Fastest Route",
): RouteOption {
  const kinds = layersForProfile(profile) as LayerKind[];
  const hitPoints = decimate(line, HIT_STEP_M);
  const pivots = decimate(line, STEP_STEP_M);
  const hits = corridorHits(hitPoints, kinds);
  const evaluation = evaluateRoute({ points: hitPoints, hits }, destination, profile, pivots);

  const dist = sumPath(line);
  const speedKmph = SPEED_KMH[profile];
  const durationMinutes = Math.max(1, Math.round((dist / 1000) / speedKmph * 60));
  const steps = withWarnings(buildSteps(pivots, destination.name), evaluation.barriersOf, evaluation.facilitiesOf);

  const reasoning =
    evaluation.barriersOf.length > 0
      ? [
          `Rute mengikuti jaringan jalan nyata (OpenStreetMap) dan menghindari ${evaluation.barriersOf.length} hambatan yang dianalisis.`,
        ]
      : ["Rute mengikuti jaringan jalan nyata (OpenStreetMap) tanpa hambatan yang dilaporkan."];
  if (evaluation.facilitiesOf.length > 0) {
    reasoning.push(`Termasuk ${evaluation.facilitiesOf.length} fasilitas aksesibel di sepanjang rute.`);
  }

  return {
    id,
    label,
    fromName: originName,
    toName: destination.name,
    destinationId: destination.id,
    recommended: false,
    distanceKm: dist / 1000,
    distanceLabel: formatDistance(dist / 1000),
    durationMinutes,
    durationLabel: `${durationMinutes} menit`,
    accessibilityScore: evaluation.score,
    scoreLabel: scoreLabel(evaluation.score),
    reasoning,
    warnings: evaluation.barriersOf.slice(0, 3).map((b) => `${b.label} dilaporkan sekitar ${b.distanceMeters} m dari awal.`),
    barriers: evaluation.barriersOf,
    facilities: evaluation.facilitiesOf,
    steps,
    geometry: line,
    honestNote: "Accessibility-informed street route based on the real OSM road network and available community data.",
  };
}

export interface StreetRouteResult extends StreetPlan {
  source: string;
}

export async function planStreetRoutes(
  origin: LatLng,
  originName: string,
  destination: DemoPlace,
  profile: AccessibilityProfileType,
): Promise<StreetRouteResult> {
  const destinationPoint: LatLng = { lat: destination.lat, lng: destination.lng };
  const lines = await fetchStreetLines(origin, destinationPoint);
  if (!lines) {
    return { routes: [], real: false, source: "demo" };
  }

  const options = lines.slice(0, 2).map((line, index) =>
    toStreetOption(line, originName, destination, profile, index === 0 ? "route-street" : "route-street-2", index === 0 ? "Most Accessible Route" : "Fastest Route"),
  );

  const [a, b] = options;
  if (!a) return { routes: [], real: false, source: "demo" };
  if (!b) {
    return { routes: [{ ...a, id: "route-street", label: "Most Accessible Route", recommended: true }], real: true, source: "osm-street" };
  }

  const aScore = a.accessibilityScore ?? -1;
  const bScore = b.accessibilityScore ?? -1;
  const best =
    aScore > bScore || (aScore === bScore && a.distanceKm <= b.distanceKm) ? a : b;
  const other = best === a ? b : a;

  const recommended = { ...best, id: "route-street", label: "Most Accessible Route" as const, recommended: true };
  const alternative = { ...other, id: "route-street-2", label: "Fastest Route" as const, recommended: false };

  return { routes: [recommended, alternative], real: true, source: "osm-street" };
}