import type { TourFeature } from "@/lib/tutorials";

/** Picu tutorial fitur secara manual (tombol "Lihat Tutorial"). */
export function startGuideTour(feature: TourFeature = "home"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("anapsi:start-tour", { detail: feature }));
}

/** Picu tutorial apa pun (tidak dipakai aplikasi; disediakan untuk pengujian). */
export function startAnyTour(feature: TourFeature): void {
  startGuideTour(feature);
}