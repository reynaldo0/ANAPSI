import type { LatLng } from "@/types";

export type { LatLng } from "@/types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function formatDistance(km: number): string {
  if (km < 1) return `≈ ${Math.max(1, Math.round(km * 1000))} m`;
  return `≈ ${km.toFixed(1)} km`;
}

export function isWithinRadius(origin: LatLng | null, target: LatLng, radiusKm: number): boolean {
  if (!origin) return true;
  return haversineKm(origin, target) <= radiusKm;
}

export interface DistanceInfo {
  km: number;
  label: string;
}

export function distanceFrom(origin: LatLng | null, target: LatLng): DistanceInfo | null {
  if (!origin) return null;
  const km = haversineKm(origin, target);
  return { km, label: formatDistance(km) };
}