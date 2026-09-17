"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Crosshair, Maximize, Navigation, Satellite } from "lucide-react";
import { haversineKm, FOCUS_CENTER } from "@/lib/geo";
import { announceLiveRegion } from "@/lib/announcement";
import { fetchGuidingLines, bboxFromPolyline } from "@/lib/realtimeOverpass";
import type { LatLng, MapLineFeature, RouteOption } from "@/types";
import { cn } from "@/lib/cn";

interface JourneyMapProps {
  route: RouteOption;
  stepIndex: number;
  onStepReached: (index: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const ARRIVAL_TRIGGER_M = 8;

/** Tinggi cluster tombol navigasi mengambang (px) agar bisa dihitung zona aman. */
const FLOAT_W = 112;

function cumMetersTable(points: LatLng[]): number[] {
  const table = [0];
  let acc = 0;
  for (let i = 1; i < points.length; i += 1) {
    acc += haversineKm(points[i - 1], points[i]) * 1000;
    table.push(acc);
  }
  return table;
}

function pointAtMeters(points: LatLng[], table: number[], meters: number): LatLng {
  const total = table[table.length - 1];
  const m = Math.max(0, Math.min(total, meters));
  if (m <= 0) return points[0];
  if (m >= total) return points[points.length - 1];
  for (let i = 1; i < points.length; i += 1) {
    if (table[i] >= m) {
      const segLen = Math.max(1e-6, table[i] - table[i - 1]);
      const f = Math.min(1, Math.max(0, (m - table[i - 1]) / segLen));
      return {
        lat: points[i - 1].lat + (points[i].lat - points[i - 1].lat) * f,
        lng: points[i - 1].lng + (points[i].lng - points[i - 1].lng) * f,
      };
    }
  }
  return points[points.length - 1];
}

function projectAlong(points: LatLng[], table: number[], pos: LatLng): number {
  let best = -1;
  let bestMeters = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const abLat = b.lat - a.lat;
    const abLng = b.lng - a.lng;
    const denom = abLat * abLat + abLng * abLng;
    let t = denom > 0 ? ((pos.lat - a.lat) * abLat + (pos.lng - a.lng) * abLng) / denom : 0;
    t = Math.max(0, Math.min(1, t));
    const px = a.lat + abLat * t;
    const py = a.lng + abLng * t;
    const dx = pos.lat - px;
    const dy = pos.lng - py;
    const d2 = dx * dx + dy * dy;
    if (best === -1 || d2 < best) {
      best = d2;
      bestMeters = table[i - 1] + t * (table[i] - table[i - 1]);
    }
  }
  return bestMeters;
}

export function JourneyMap({ route, stepIndex, onStepReached, onNext, onPrev }: JourneyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  const watchRef = useRef<number | null>(null);
  const stepRef = useRef(stepIndex);
  const followRef = useRef(true);
  const lastEaseRef = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [follow, setFollow] = useState(true);
  const [status, setStatus] = useState<"waiting" | "active" | "denied" | "unsupported">(() =>
    typeof window !== "undefined" && "geolocation" in navigator
      ? "waiting"
      : "unsupported",
  );
  const [guidingReload, setGuidingReload] = useState(0);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);

  /** Posisi layar (px, relatif kontainer) untuk tombol navigasi mengambang, diklamp ke zona aman. */
  const updateFloatPos = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mapRef.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const um = userMarkerRef.current as any;
    const el = containerRef.current;
    if (!m || !um || !el) return;
    try {
      const lngLat = um.getLngLat() as { lng: number; lat: number };
      const p = m.project([lngLat.lng, lngLat.lat]);
      const w = el.clientWidth;
      const h = el.clientHeight;
      const half = FLOAT_W / 2;
      const x = Math.max(16 + half, Math.min(w - 16 - half, p.x));
      const y = Math.max(132, Math.min(h - 16 - 48, p.y - 64));
      const next = { x: Math.round(x), y: Math.round(y) };
      setFloatPos((prev) => (prev && Math.abs(prev.x - next.x) < 2 && Math.abs(prev.y - next.y) < 2 ? prev : next));
    } catch {}
  }, []);

  const geometry = useMemo(() => route.geometry ?? [], [route]);
  const table = useMemo(() => cumMetersTable(geometry), [geometry]);

  // Titik instruksi = batas antarsegmen (skala rasio panjang geometri vs total jarak step).
  const boundaries = useMemo(() => {
    const stepsTotal = route.steps.reduce((acc, s) => acc + Math.max(0, s.distanceMeters), 0);
    const total = table[table.length - 1];
    const k = stepsTotal > 0 ? total / stepsTotal : 1;
    const arr: number[] = [];
    let acc = 0;
    for (let i = 0; i < route.steps.length; i += 1) {
      arr.push(i === 0 ? 0 : acc * k);
      acc += Math.max(0, route.steps[i].distanceMeters);
    }
    return arr;
  }, [route, table]);

  const routePointsCum = useMemo(() => {
    return route.steps.map((_, i) => {
      const m = boundaries[Math.min(i, boundaries.length - 1)];
      return pointAtMeters(geometry, table, m);
    });
  }, [route, boundaries, geometry, table]);

  useEffect(() => {
    stepRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !containerRef.current) return;
        const first = geometry[0];
        const last = geometry[geometry.length - 1];
        const start: LatLng = first ?? FOCUS_CENTER;
        const end: LatLng = last ?? start;
        const mid: LatLng = {
          lat: (start.lat + end.lat) / 2,
          lng: (start.lng + end.lng) / 2,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m: any = new (maplibregl as unknown as { Map: new (o: unknown) => unknown }).Map({
          container: containerRef.current,
          style: STYLE_URL,
          center: [mid.lng, mid.lat],
          zoom: 15,
          pitch: 48,
          bearing: -18,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
        });
        mapRef.current = m;

        const North = (maplibregl as unknown as { NavigationControl: new (o: unknown) => unknown }).NavigationControl;
        m.addControl(new North({ showCompass: true, showZoom: true }), "top-right");

        m.on("load", () => {
          try {
            if (geometry.length >= 2) {
              const coords = geometry.map((p) => [p.lng, p.lat]);
              m.addSource("route", {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "LineString", coordinates: coords },
                },
              });
              m.addLayer({
                id: "route-casing",
                type: "line",
                source: "route",
                layout: { "line-cap": "round", "line-join": "round" },
                paint: { "line-color": "#0f172a", "line-width": 9, "line-opacity": 0.85 },
              });
              m.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                layout: { "line-cap": "round", "line-join": "round" },
                paint: { "line-color": "#2563eb", "line-width": 6 },
              });
            }

            // Sumber garis pandu (guiding block / tactile paving) — diisi asinkron.
            m.addSource("guiding", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            m.addLayer({
              id: "guiding-case",
              type: "line",
              source: "guiding",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.95 },
            });
            m.addLayer(
              {
                id: "guiding-line",
                type: "line",
                source: "guiding",
                layout: { "line-cap": "round", "line-join": "round" },
                paint: { "line-color": ["get", "color"], "line-width": 4 },
              },
              "guiding-case",
            );
          } catch {}

          const fitBoundsMaplibre = geometry.length >= 2;
          if (fitBoundsMaplibre) {
            try {
              m.fitBounds(
                [
                  [Math.min(start.lng, end.lng) - 0.002, Math.min(start.lat, end.lat) - 0.002],
                  [Math.max(start.lng, end.lng) + 0.002, Math.max(start.lat, end.lat) + 0.002],
                ],
                { padding: 70, duration: 800, pitch: 48, bearing: -18 },
              );
            } catch {}
          }
          setLoaded(true);
          announceLiveRegion("Peta 3D rute siap. Posisimu akan ditandai otomatis bila sinyal GPS tersedia.");
          updateFloatPos();
        });

        // Pin: mulai, tujuan, dan tiap titik instruksi.
        const makeDot = (bg: string, size = 22) => {
          const el = document.createElement("button");
          el.setAttribute("type", "button");
          el.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;background:${bg};border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);cursor:pointer;`;
          return el;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Marker = (maplibregl as any).Marker as { new (o: unknown): any };
        const markers: { remove: () => void }[] = [];
        const addMarker = (
          pos: LatLng,
          el: HTMLElement,
          ariaLabel: string,
        ) => {
          el.setAttribute("aria-label", ariaLabel);
          try {
            const mk = new Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(m);
            markers.push(mk);
          } catch {}
        };

        const startDot = makeDot("#15803d", 24);
        startDot.textContent = "A";
        startDot.style.color = "#fff";
        startDot.style.fontSize = "11px";
        startDot.style.fontWeight = "900";
        startDot.style.display = "flex";
        startDot.style.alignItems = "center";
        startDot.style.justifyContent = "center";
        addMarker(start, startDot, `Titik awal: ${route.fromName}`);

        const endDot = makeDot("#dc2626", 24);
        endDot.textContent = "B";
        endDot.style.color = "#fff";
        endDot.style.fontSize = "11px";
        endDot.style.fontWeight = "900";
        endDot.style.display = "flex";
        endDot.style.alignItems = "center";
        endDot.style.justifyContent = "center";
        addMarker(end, endDot, `Tujuan: ${route.toName}`);

        route.steps.forEach((step, i) => {
          if (step.isArrival) return;
          const pt = routePointsCum[i];
          const el = makeDot(stepIndex === i ? "#1d4ed8" : "#334155", 18);
          el.textContent = String(i + 1);
          el.style.color = "#fff";
          el.style.fontSize = "10px";
          el.style.fontWeight = "800";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          addMarker(pt, el, `Titik instruksi ${i + 1}: ${step.instruction}. ${step.barrierLabel ?? ""} ${step.facilityLabel ?? ""}`.trim());
        });

        (route.barriers ?? []).slice(0, 10).forEach((b) => {
          const total = table[table.length - 1];
          const stepsTotal = route.steps.reduce((acc, s) => acc + Math.max(0, s.distanceMeters), 0);
          const k = stepsTotal > 0 ? total / stepsTotal : 1;
          const el = makeDot("#f59e0b", 22);
          el.textContent = "⚠";
          el.style.fontSize = "12px";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          addMarker(pointAtMeters(geometry, table, Math.max(0, b.distanceMeters * k)), el, `Hambatan: ${b.label} sekitar ${b.distanceMeters} meter.`);
        });

        (route.facilities ?? []).slice(0, 10).forEach((f) => {
          const total = table[table.length - 1];
          const stepsTotal = route.steps.reduce((acc, s) => acc + Math.max(0, s.distanceMeters), 0);
          const k = stepsTotal > 0 ? total / stepsTotal : 1;
          const el = makeDot("#16a34a", 22);
          el.textContent = "✓";
          el.style.fontSize = "12px";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          addMarker(pointAtMeters(geometry, table, Math.max(0, f.distanceMeters * k)), el, `Fasilitas: ${f.label}.`);
        });

        // Titik posisi pengguna (GPS) — siluet orang (posisi terkini).
        const userEl = document.createElement("button");
        userEl.setAttribute("type", "button");
        userEl.setAttribute("aria-label", "Posisimu saat ini");
        userEl.style.cssText = "width:32px;height:32px;border-radius:9999px;background:#2563eb;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px rgba(37,99,235,.22),0 2px 12px rgba(0,0,0,.4);cursor:pointer;";
        userEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>`;
        try {
          userMarkerRef.current = new Marker({ element: userEl }).setLngLat([mid.lng, mid.lat]).addTo(m);
        } catch {}
        updateFloatPos();
        m.on("move", updateFloatPos);
      } catch {
        if (!cancelled) setMapError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (watchRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      try {
        (mapRef.current as { remove?: () => void } | null)?.remove?.();
        mapRef.current = null;
        userMarkerRef.current = null;
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // Muat garis pandu tunanetra (kuning) di sekitar rute.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const lines = await fetchGuidingLines(bboxFromPolyline(geometry, 0.01));
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = mapRef.current as any;
        const features = lines.map((g: MapLineFeature) => ({
          type: "Feature",
          properties: {
            color:
              g.tone === "success"
                ? "#facc15"
                : g.tone === "warning"
                  ? "#f59e0b"
                  : "#94a3b8",
          },
          geometry: {
            type: "LineString",
            coordinates: g.points.map((p) => [p.lng, p.lat]),
          },
        }));
        try {
          (m?.getSource("guiding") as { setData?: (d: unknown) => void } | null)?.setData?.({
            type: "FeatureCollection",
            features,
          });
        } catch {}
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, geometry, guidingReload]);

  // GPS + deteksi progres otomatis.
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pos: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
        const m = mapRef.current;
        let meters = 0;
        if (geometry.length >= 2) {
          meters = projectAlong(geometry, table, pos);
          const total = table[table.length - 1];
          let next = 0;
          if (meters >= total - ARRIVAL_TRIGGER_M) {
            next = route.steps.length - 1;
          } else {
            for (let i = 0; i < route.steps.length - 1; i += 1) {
              if (meters >= boundaries[Math.min(i + 1, boundaries.length - 1)]) next = i + 1;
            }
          }
          if (next > stepRef.current) {
            if (typeof onStepReached === "function") onStepReached(next);
            stepRef.current = next;
          }
        }
        try {
          userMarkerRef.current?.setLngLat?.([pos.lng, pos.lat]);
        } catch {}
        updateFloatPos();
        const now = Date.now();
        if (followRef.current && m && now - lastEaseRef.current > 900) {
          lastEaseRef.current = now;
          try {
            m.easeTo({ center: [pos.lng, pos.lat], zoom: 17, duration: 900 });
          } catch {}
        }
        setStatus("active");
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
    return () => {
      if (watchRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, geometry, table, boundaries]);

  const centerOnUser = () => {
    const m = mapRef.current;
    if (!m || !userMarkerRef.current) {
      announceLiveRegion("Posisi belum terdeteksi. Atur posisi manual lalu lanjutkan dengan tombol berikutnya.");
      return;
    }
    try {
      const lngLat = userMarkerRef.current.getLngLat() as { lng: number; lat: number };
      m.easeTo({ center: [lngLat.lng, lngLat.lat], zoom: 17, duration: 600 });
      announceLiveRegion("Peta dipusatkan ke posisimu.");
    } catch {}
  };

  const refitRoute = () => {
    const m = mapRef.current;
    if (!m || geometry.length < 2) return;
    const start = geometry[0];
    const end = geometry[geometry.length - 1];
    try {
      m.fitBounds(
        [
          [Math.min(start.lng, end.lng) - 0.003, Math.min(start.lat, end.lat) - 0.003],
          [Math.max(start.lng, end.lng) + 0.003, Math.max(start.lat, end.lat) + 0.003],
        ],
        { padding: 60, duration: 700, pitch: 48, bearing: -18 },
      );
    } catch {}
  };

  const toggleFollow = () => {
    const next = !follow;
    setFollow(next);
    followRef.current = next;
    announceLiveRegion(next ? "Ikuti posisi aktif. Peta mengikutimu." : "Ikuti posisi dimatikan. Geser peta bebas.");
  };

  return (
    <div className="relative overflow-hidden rounded-16 border-2 border-border bg-card shadow-card">
      {mapError ? (
        <div className="h-[300px] w-full grid place-items-center bg-muted/60 p-6 text-center text-sm text-muted-foreground">
          Peta 3D tidak dapat dimuat saat ini. Kamu tetap bisa mengikuti petunjuk langkah demi langkah lewat audio
          dan tombol di bawah.
        </div>
      ) : (
        <div
          ref={containerRef}
          role="application"
          aria-label="Peta 3D navigasi. Garis biru adalah rute, garis kuning adalah jalur pemandu tunanetra bila tersedia, dan titik biru berdenyut adalah posisimu."
          className="h-[400px] w-full sm:h-[520px]"
          style={{ background: "#e5e7eb" }}
        />
      )}
      {!loaded && !mapError ? (
        <div className="absolute inset-0 grid place-items-center bg-muted/60 text-sm text-muted-foreground">
          Memuat peta rute 3D…
        </div>
      ) : null}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleFollow}
          aria-pressed={follow}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-12 border px-3 text-sm font-bold shadow-float",
            follow ? "border-primary bg-primary text-primary-foreground" : "bg-background border-border",
          )}
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Ikuti posisi
        </button>
        <button
          type="button"
          onClick={centerOnUser}
          className="inline-flex h-11 items-center gap-2 rounded-12 border-2 border-border bg-background px-3 text-sm font-bold shadow-float hover:bg-muted"
        >
          <Crosshair className="h-4 w-4" aria-hidden="true" />
          Pusatkan ke saya
        </button>
        <button
          type="button"
          onClick={() => setGuidingReload((v) => v + 1)}
          className="inline-flex h-11 items-center gap-2 rounded-12 border-2 border-border bg-background px-3 text-sm font-bold shadow-float hover:bg-muted"
        >
          <Satellite className="h-4 w-4" aria-hidden="true" />
          Muat ulang guiding block
        </button>
      </div>
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={refitRoute}
          aria-label="Tampilkan seluruh rute"
          className="flex h-12 w-12 items-center justify-center rounded-12 border-2 border-border bg-background shadow-float hover:bg-muted"
        >
          <Maximize className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Tombol navigasi mengambang: ikut posisi pengguna otomatis, tetap bisa diklik. */}
      {floatPos && (onPrev || onNext) ? (
        <div
          className="absolute z-20 flex items-center gap-2 rounded-full border border-border/60 bg-card/90 p-1.5 shadow-float backdrop-blur"
          style={{ left: floatPos.x, top: floatPos.y, transform: "translate(-50%, 0)" }}
        >
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev || stepIndex === 0}
            aria-label="Segmen sebelumnya"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border bg-background text-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="sr-only">{`Segmen ${Math.min(stepIndex + 1, route.steps.length - 1)} dari ${route.steps.length - 1}`}</span>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext || stepIndex >= route.steps.length - 1}
            aria-label="Segmen berikutnya"
            className="flex h-11 w-11 items-center justify-center rounded-full primary-solid text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {status === "active"
          ? "Sinyal GPS aktif. Titik biru menunjukkan posisimu; peta mengikuti secara otomatis."
          : status === "denied"
            ? "Izin lokasi ditolak. Peta tetap menampilkan rute; gunakan tombol berikutnya untuk tiap instruksi."
            : status === "unsupported"
              ? "GPS tidak didukung perangkat ini. Gunakan tombol navigasi."
              : "Menunggu sinyal GPS."}
      </p>
      <p className="absolute bottom-1 left-3 z-10 text-[11px] text-slate-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        Garis biru: rute kamu. Garis kuning: guiding block. Titik biru berdenyut: posisimu.
      </p>
    </div>
  );
}