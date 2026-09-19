"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Layers3, Locate, Minus, Plus } from "lucide-react";
import { announceLiveRegion } from "@/lib/announcement";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { AudioPriority } from "@/types";
import { cn } from "@/lib/cn";
import { type LatLng, FOCUS_CENTER } from "@/lib/geo";
import type { MapFeatureReturn, MapLineFeature, PlaceSummary } from "@/types";

interface Props {
  places: PlaceSummary[];
  features: MapFeatureReturn[];
  guidingLines?: MapLineFeature[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  currentLocation: LatLng | null;
  onLocate: () => void;
  realtimeFeatures?: MapFeatureReturn[];
  tall?: boolean;
  /** Titik dari hasil pencarian untuk diarahkan/difokus peta. */
  focus?: { lat: number; lng: number; name: string } | null;
}

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Ikon simbolis sesuai kategori tempat (fallback pin). */
function placeIcon(category: string): string {
  const c = category.toLowerCase();
  if (/(pendidikan|school|education|universit|sekolah|kampus|sekolah tinggi|institute)/.test(c)) return "🎓";
  if (/(masjid|muslim|mushola|musholla)/.test(c)) return "🕌";
  if (/(kuliner|makan|restoran|food|restaurant|cafe|kopi|coffee|warung|kedai)/.test(c)) return "🍽️";
  if (/(kesehatan|rumah sakit|klinik|health|hospital|clinic|pharma|apotek|puskesmas|dokter)/.test(c)) return "🏥";
  if (/(ibada|worship|church|gereja|temple|kuil|pura|vihara|kathedral)/.test(c)) return "⛪";
  if (/(transport|stasiun|station|terminal|bus|kereta|halte|angkot)/.test(c)) return "🚉";
  if (/(rekreasi|taman|park|wisata|recreation|leisure|museum|taman kota)/.test(c)) return "🌳";
  if (/(belanja|mall|shopping|retail|pasar|supermarket|minimarket|toko)/.test(c)) return "🛒";
  if (/(hotel|penginapan|lodging|guest|hostel|resort)/.test(c)) return "🏨";
  if (/(bank|keuangan|finance|atm|kantor|office)/.test(c)) return "🏦";
  if (/(pemerintah|government|kelurahan|camat|kotamadya|kecamatan)/.test(c)) return "🏛️";
  if (/(olahraga|sport|gym|fitness|stadion|lapangan|kolam renang)/.test(c)) return "⚽";
  return "📍";
}

/** Marker posisi terkini pengguna berbentuk orang (siluet berjalan). */
function personMarkerSvg(color: string, size = 20): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>`;
}

export function Accessible3DMap({ places, features, selectedPlaceId, onSelectPlace, currentLocation, onLocate, realtimeFeatures, guidingLines = [], tall = false, focus = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const lineReadyRef = useRef(false);
  const audio = useAudioManager();
  const [is3D, setIs3D] = useState(true);
  const [terrainOn, setTerrainOn] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const zoomStep = (in_: boolean = true) => {
    const m = mapRef.current as { zoomIn?: () => void; zoomOut?: () => void } | null;
    if (!m) return;
    try {
      if (in_) m.zoomIn?.();
      else m.zoomOut?.();
    } catch {}
  };

  /** Baca suara saat fitur / tempat diklik agar mudah diakses penyandang disabilitas. */
  const speakSelection = useCallback(
    (text: string) => {
      audio.speak(text, AudioPriority.UserRequestedInformation);
      announceLiveRegion(text);
    },
    [audio],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !containerRef.current) return;
      const center: [number, number] = currentLocation ? [currentLocation.lng, currentLocation.lat] : [FOCUS_CENTER.lng, FOCUS_CENTER.lat];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m: any = new (maplibregl as unknown as { Map: new (o: unknown) => unknown }).Map({
        container: containerRef.current,
        style: STYLE_URL,
        center,
        zoom: 15,
        pitch: is3D ? 55 : 0,
        bearing: is3D ? -12 : 0,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
      });
      mapRef.current = m;
      m.on("load", () => {
        try {
          // Terrain gratis global (AWS Open Data — Terrarium encoding)
          m.addSource("terrain", { type: "raster-dem", tiles: ["https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 15, encoding: "terrarium" });
          m.setTerrain(terrainOn ? { source: "terrain", exaggeration: 1.2 } : null);
          // 3D buildings extrusion
          const layers = m.getStyle().layers;
          const labelLayer = layers.find((l: { type: string }) => l.type === "symbol")?.id;
          m.addLayer({ id: "3d-buildings", source: "openmaptiles", "source-layer": "building", type: "fill-extrusion", minzoom: 14, paint: { "fill-extrusion-color": "#d1d5db", "fill-extrusion-height": ["get", "render_height"], "fill-extrusion-base": ["get", "render_min_height"], "fill-extrusion-opacity": 0.7 } }, labelLayer);
        } catch {}
        setLoaded(true);
        announceLiveRegion("Peta 3D siap. Gunakan daftar di bawah untuk navigasi tunanetra.", { assertive: true });
      });
    })();
    return () => { cancelled = true; try { (mapRef.current as { remove?: () => void })?.remove?.(); } catch {} };
  }, []); // init once

  useEffect(() => {
    const m = mapRef.current as { setTerrain?: (o: unknown)=>void; setPitch?: (n:number)=>void; easeTo?: (o:unknown)=>void; flyTo?: (o:unknown)=>void } | null;
    if (!m || !loaded) return;
    try {
      if (terrainOn) m.setTerrain?.({ source: "terrain", exaggeration: 1.2 }); else m.setTerrain?.(null);
      m.easeTo?.({ pitch: is3D ? 55 : 0, bearing: is3D ? -12 : 0, duration: 600 });
    } catch {}
  }, [is3D, terrainOn, loaded]);

  useEffect(() => {
    if (!currentLocation || !loaded) return;
    try { (mapRef.current as { flyTo?: (o:unknown)=>void})?.flyTo?.({ center: [currentLocation.lng, currentLocation.lat], zoom: 16, duration: 1200 }); } catch {}
  }, [currentLocation, loaded]);

  useEffect(() => {
    if (!focus || !loaded) return;
    try { (mapRef.current as { flyTo?: (o:unknown)=>void})?.flyTo?.({ center: [focus.lng, focus.lat], zoom: 16, duration: 1200 }); } catch {}
  }, [focus, loaded]);

  // Render markers as HTML markers (accessible) via effect
  useEffect(() => {
    if (!loaded) return;
    const markers: { remove: () => void }[] = [];
    (async () => {
      const maplibregl = await import("maplibre-gl");
      const m = mapRef.current as { getContainer?: ()=>HTMLElement } | null;
      if (!m) return;
      // clear old handled via remove below
      const all = [...features, ...(realtimeFeatures ?? [])];
      for (const f of all.slice(0, 80)) {
        const el = document.createElement("button");
        el.setAttribute("aria-label", `${f.label} ${f.statusLabel}. Tekan Enter untuk pilih.`);
        el.style.cssText = "width:28px;height:28px;border-radius:9999px;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);";
        el.style.background = f.tone === "success" ? "var(--color-success)" : f.tone === "warning" ? "var(--color-warning)" : f.tone === "danger" ? "var(--color-danger)" : "#64748b";
        el.textContent = f.symbol || "•";
        el.style.color = "white";
        el.onclick = () => {
          const parts = [f.label];
          if (f.statusLabel && f.statusLabel !== f.label) parts.push(f.statusLabel);
          if (f.placeName) parts.push(`di ${f.placeName}`);
          speakSelection(`${parts.join(". ")}.`);
          onSelectPlace(f.placeId ?? null);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MarkerCtor = (maplibregl as any).Marker;
        const marker = new MarkerCtor({ element: el }).setLngLat([f.lng, f.lat]).addTo(mapRef.current);
        markers.push(marker);
      }
      for (const p of places.slice(0, 40)) {
        const el = document.createElement("button");
        const isSelected = p.id === selectedPlaceId;
        el.setAttribute("aria-label", `${p.name} ${p.category} ${p.distanceLabel ?? ""}`);
        el.setAttribute("aria-pressed", String(isSelected));
        el.style.cssText = `width:${isSelected ? 36 : 30}px;height:${isSelected ? 36 : 30}px;border-radius:9999px;border:3px solid ${isSelected ? "black" : "white"};display:flex;align-items:center;justify-content:center;font-weight:900;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.3);`;
        el.style.background = "var(--color-primary)";
        el.style.color = "white";
        el.textContent = placeIcon(p.category);
        el.onclick = () => {
          const parts = [p.name, p.category];
          if (p.distanceLabel) parts.push(p.distanceLabel);
          speakSelection(`${parts.join(". ")}.`);
          onSelectPlace(p.id);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MarkerCtor2 = (maplibregl as any).Marker;
        const marker = new MarkerCtor2({ element: el }).setLngLat([p.lng, p.lat]).addTo(mapRef.current);
        markers.push(marker);
      }
      if (currentLocation) {
        const el = document.createElement("button");
        el.setAttribute("type", "button");
        el.setAttribute("aria-label", "Lokasi saya saat ini");
        el.style.cssText =
          "width:34px;height:34px;border-radius:9999px;background:#ffffff;border:3px solid var(--color-primary);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(37,99,235,.22),0 2px 12px rgba(0,0,0,.4);cursor:pointer;";
        el.innerHTML = personMarkerSvg("var(--color-primary)");
        el.onclick = () => speakSelection("Lokasi saya saat ini.");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MarkerCtor3 = (maplibregl as any).Marker;
        const marker = new MarkerCtor3({ element: el }).setLngLat([currentLocation.lng, currentLocation.lat]).addTo(mapRef.current);
        markers.push(marker);
      }
    })();
    return () => { markers.forEach((mm) => { try { mm.remove(); } catch {} }); };
  }, [places, features, realtimeFeatures, selectedPlaceId, currentLocation, loaded, onSelectPlace, speakSelection]);

  // Lapisan garis pemandu (guiding block / tactile paving) — kuning.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mapRef.current as any;
    if (!m || !loaded) return;
    const features = guidingLines.map((g) => ({
      type: "Feature",
      properties: {
        color: g.tone === "success" ? "#facc15" : g.tone === "warning" ? "#f59e0b" : "#94a3b8",
      },
      geometry: {
        type: "LineString",
        coordinates: g.points.map((p) => [p.lng, p.lat]),
      },
    }));
    try {
      if (lineReadyRef.current) {
        (m.getSource?.("guiding") as { setData?: (d: unknown) => void } | undefined)?.setData?.({
          type: "FeatureCollection",
          features,
        });
      } else {
        m.addSource?.("guiding", { type: "geojson", data: { type: "FeatureCollection", features } });
        m.addLayer?.(
          {
            id: "guiding-case",
            type: "line",
            source: "guiding",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.95 },
          },
        );
        m.addLayer?.(
          {
            id: "guiding-line",
            type: "line",
            source: "guiding",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": ["get", "color"], "line-width": 4 },
          },
          "guiding-case",
        );
        lineReadyRef.current = true;
      }
    } catch {}
  }, [loaded, guidingLines]);

  return (
    <div className={cn("relative overflow-hidden", tall ? "h-full w-full" : "rounded-16 border-2 border-border bg-card shadow-card")}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Peta 3D interaktif gratis. Geser, cubit zoom, putar 2 jari untuk 3D. Bagi tunanetra, gunakan daftar tempat di bawah peta sebagai alternatif utama."
        className={tall ? "h-full w-full" : "h-[420px] w-full sm:h-[560px]"}
        style={{ background: "#e5e7eb" }}
      />
      {!loaded ? <div className="absolute inset-0 grid place-items-center bg-muted/60 text-sm text-muted-foreground">Memuat peta 3D gratis…</div> : null}
      <div className="absolute bottom-3 left-3 flex items-end gap-2">
        {loaded ? (
          <div className="flex flex-col gap-2 rounded-12 border-2 border-border bg-background p-1 shadow-float">
            <button
              type="button"
              aria-label="Perbesar peta"
              title="Perbesar"
              onClick={() => zoomStep()}
              className="flex h-11 w-11 items-center justify-center rounded-10 text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Perkecil peta"
              title="Perkecil"
              onClick={() => zoomStep(false)}
              className="flex h-11 w-11 items-center justify-center rounded-10 text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Minus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setIs3D((v) => !v)} aria-pressed={is3D} aria-label={is3D ? "Matikan tampilan 3D" : "Aktifkan tampilan 3D"} className={`inline-flex h-11 items-center gap-2 rounded-12 border px-3 text-sm font-bold shadow-float ${is3D ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
            <Box className="h-4 w-4" aria-hidden="true" /> {is3D ? "3D Aktif" : "2D"}
          </button>
          <button type="button" onClick={() => setTerrainOn((v) => !v)} aria-pressed={terrainOn} aria-label="Toggle terrain 3D" className={`inline-flex h-11 items-center gap-2 rounded-12 border px-3 text-sm font-bold shadow-float ${terrainOn ? "bg-card border-border" : "bg-muted text-muted-foreground"}`}>
            <Layers3 className="h-4 w-4" aria-hidden="true" /> Terrain
          </button>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 md:bottom-16">
        <button type="button" aria-label="Lokasi saya" onClick={onLocate} className="flex h-12 w-12 items-center justify-center rounded-12 border-2 border-border bg-background shadow-float hover:bg-muted">
          <Locate className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p className="sr-only" role="status">Peta 3D aktif. Semua pin juga tersedia sebagai daftar teks yang dapat diakses keyboard di bawah peta.</p>
    </div>
  );
}
