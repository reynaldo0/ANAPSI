"use client";

import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { type LatLng, FOCUS_CENTER } from "@/lib/geo";
import { verificationLabel } from "@/lib/verification";
import type { MapFeatureReturn, PlaceSummary } from "@/types";

export const MAP_ORIGIN: LatLng = FOCUS_CENTER;
const DEFAULT_PX_PER_KM = 260;
const MIN_PX_PER_KM = 40;
const MAX_PX_PER_KM = 2200;

const METERS_PER_DEG = 111_320;

interface MapPanelProps {
  places: PlaceSummary[];
  features: MapFeatureReturn[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  currentLocation: LatLng | null;
  currentLocationLabel: string | null;
  onLocate: () => void;
}

interface Point {
  x: number;
  y: number;
}

function project(center: LatLng, point: LatLng, pxPerKm: number): Point {
  return {
    x: 400 + (point.lng - center.lng) * METERS_PER_DEG * (pxPerKm / 1000),
    y: 300 - (point.lat - center.lat) * METERS_PER_DEG * (pxPerKm / 1000),
  };
}

const TONE_SHAPE: Record<string, string> = {
  success: "M -8 -6 H 8 V 6 H -8 Z",
  warning: "M 0 -8 L 8 0 L 0 8 L -8 0 Z",
  danger: "M 0 -7 L 7 6 H -7 Z",
  neutral: "M -8 -8 H 8 V 8 H -8 Z",
};

function toneColor(tone: string): string {
  switch (tone) {
    case "success":
      return "var(--color-success)";
    case "warning":
      return "var(--color-warning)";
    case "danger":
      return "var(--color-danger)";
    default:
      return "var(--color-muted-foreground)";
  }
}

const DEMO_STREETS: LatLng[][] = [
  [
    { lat: -6.199, lng: 106.873 },
    { lat: -6.197, lng: 106.881 },
  ],
  [
    { lat: -6.2015, lng: 106.8725 },
    { lat: -6.2005, lng: 106.88 },
  ],
  [
    { lat: -6.195, lng: 106.875 },
    { lat: -6.203, lng: 106.8765 },
  ],
  [
    { lat: -6.192, lng: 106.882 },
    { lat: -6.203, lng: 106.879 },
  ],
];

const PLACE_SYMBOLS: Record<string, { symbol: string; tone: string }> = {
  high: { symbol: "✓", tone: "success" },
  medium: { symbol: "⚠", tone: "warning" },
  low: { symbol: "✕", tone: "danger" },
  unknown: { symbol: "?", tone: "neutral" },
};

function placeSymbol(place: PlaceSummary): { symbol: string; tone: string } {
  const score = Math.max(place.score?.visual ?? 0, place.score?.mobility ?? 0);
  if (score >= 4) return PLACE_SYMBOLS.high;
  if (score >= 3) return PLACE_SYMBOLS.medium;
  if (score > 0) return PLACE_SYMBOLS.low;
  return PLACE_SYMBOLS.unknown;
}

export function MapPanel({
  places,
  features,
  selectedPlaceId,
  onSelectPlace,
  currentLocation,
  currentLocationLabel,
  onLocate,
}: MapPanelProps) {
  const [center, setCenter] = useState<LatLng>(MAP_ORIGIN);
  const [pxPerKm, setPxPerKm] = useState(DEFAULT_PX_PER_KM);
  const dragRef = useRef<{ startX: number; startY: number; center: LatLng; moved: boolean } | null>(null);

  const zoomBy = useCallback((factor: number) => {
    setPxPerKm((value) =>
      Math.min(MAX_PX_PER_KM, Math.max(MIN_PX_PER_KM, value * factor)),
    );
  }, []);

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    const factor = event.deltaY < 0 ? 1.25 : 0.8;
    zoomBy(factor);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, center, moved: false };
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dxPx = event.clientX - drag.startX;
    const dyPx = event.clientY - drag.startY;
    if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) drag.moved = true;
    const dLat = dyPx / (METERS_PER_DEG * (pxPerKm / 1000));
    const dLng = -dxPx / (METERS_PER_DEG * (pxPerKm / 1000));
    setCenter({ lat: drag.center.lat + dLat, lng: drag.center.lng + dLng });
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) {
      event.currentTarget?.releasePointerCapture?.(event.pointerId);
      event.preventDefault();
    }
  };

  const toScreen = (point: LatLng): Point => project(center, point, pxPerKm);

  const visiblePlaces = places;
  const visibleFeatures = features;

  return (
    <div className="relative overflow-hidden rounded-16 border border-border bg-card shadow-card">
      <svg
        role="img"
        aria-label={`Peta interaktif area ${currentLocationLabel ? "di sekitar lokasimu" : "Rawamangun, Jakarta Timur"}. Gunakan tombol Lokasi Saya untuk memusatkan, atau buka tampilan daftar untuk penjelasan teks lengkap.`}
        viewBox="0 0 800 600"
        className="h-[420px] w-full touch-none select-none bg-muted/40 sm:h-[560px]"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
      >
        <rect x="0" y="0" width="800" height="600" fill="currentColor" className="text-background" opacity="0.4" />

        <g aria-hidden="true" stroke="currentColor" className="text-border" strokeWidth="2" fill="none">
          {DEMO_STREETS.map((polyline, index) => {
            const points = polyline.map(toScreen);
            return (
              <path
                key={index}
                d={`M ${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}`}
              />
            );
          })}
        </g>

        {visibleFeatures.map((feature) => {
          const p = toScreen(feature);
          const label = `${feature.symbol} ${feature.label}. ${verificationLabel(feature.verification)}`;
          const shape = TONE_SHAPE[feature.tone];
          return (
            <g
              key={feature.id}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={(event) => {
                event.stopPropagation();
                if (!dragRef.current?.moved) onSelectPlace(feature.placeId ?? null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPlace(feature.placeId ?? null);
                }
              }}
              className="cursor-pointer outline-offset-2"
            >
              <title>{label}</title>
              <path d={shape} fill={toneColor(feature.tone)} opacity="0.9" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="13"
                fill="var(--color-background)"
                className="font-bold"
              >
                {feature.symbol}
              </text>
            </g>
          );
        })}

        {visiblePlaces.map((place) => {
          const p = toScreen(place);
          const meta = placeSymbol(place);
          const selected = place.id === selectedPlaceId;
          const label = `${place.name}, ${place.category}. ${meta.symbol} ${meta.tone === "success" ? "aksesibel" : meta.tone === "warning" ? "akses terbatas" : meta.tone === "danger" ? "banyak hambatan" : "belum dinilai"}.`;
          return (
            <g
              key={place.id}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation();
                if (!dragRef.current?.moved) onSelectPlace(place.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPlace(place.id);
                }
              }}
              className="cursor-pointer outline-offset-2"
            >
              <title>{label}</title>
              <path
                d={TONE_SHAPE[meta.tone]}
                fill={toneColor(meta.tone)}
                opacity="0.95"
                transform={selected ? "scale(1.35)" : undefined}
                stroke="var(--color-foreground)"
                strokeWidth={selected ? 3 : 0}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="15"
                fill="var(--color-background)"
                className="font-bold"
              >
                {meta.symbol}
              </text>
              <text y="22" textAnchor="middle" fontSize="9" fill="var(--color-foreground)" className="font-medium">
                {place.name.slice(0, 14)}
              </text>
            </g>
          );
        })}

        {currentLocation ? (
          <g transform={`translate(${toScreen(currentLocation).x.toFixed(1)} ${toScreen(currentLocation).y.toFixed(1)})`}>
            <circle r="12" fill="var(--color-primary)" opacity="0.25">
              <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle r="5" fill="var(--color-success)" stroke="var(--color-background)" strokeWidth="2" />
          </g>
        ) : null}
      </svg>

      <div className="absolute right-3 top-3 flex flex-col gap-2" aria-label="Kontrol peta">
        <button
          type="button"
          aria-label="Perbesar peta"
          onClick={() => zoomBy(1.4)}
          className="flex h-10 w-10 items-center justify-center rounded-12 border border-border bg-background text-foreground shadow-float transition-colors hover:bg-muted"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Perkecil peta"
          onClick={() => zoomBy(1 / 1.4)}
          className="flex h-10 w-10 items-center justify-center rounded-12 border border-border bg-background text-foreground shadow-float transition-colors hover:bg-muted"
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Lokasi saya"
          onClick={onLocate}
          className="flex h-10 w-10 items-center justify-center rounded-12 border border-border bg-background text-foreground shadow-float transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <Crosshair className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <p className="sr-only" role="status">
        {currentLocationLabel ? `Lokasi saat ini: ${currentLocationLabel}` : "Lokasi otomatis belum tersedia. Posisi peta: Rawamangun, Jakarta Timur."}
      </p>
    </div>
  );
}