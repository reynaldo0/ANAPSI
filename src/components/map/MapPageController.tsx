"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, List, Map as MapIcon, Navigation, X } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Accessible3DMap } from "@/components/map/Accessible3DMap";
import { FeatureList } from "@/components/map/FeatureList";
import { ResultList } from "@/components/map/ResultList";
import { Button } from "@/components/ui/Button";
import { TourTrigger } from "@/components/tutorial/TourTrigger";
import { announceLiveRegion } from "@/lib/announcement";
import { LAYERS, layersForProfile, type LayerKind } from "@/lib/data/layers";
import { summaryScore } from "@/lib/data/places-core";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { cn } from "@/lib/cn";
import type { LatLng } from "@/lib/geo";
import type { MapFeatureReturn, MapLineFeature, PlaceSummary } from "@/types";

interface PlacesResponse {
  ok: boolean;
  data: { places: PlaceSummary[]; source: string };
}

interface FeaturesResponse {
  ok: boolean;
  data: { features: MapFeatureReturn[]; source: string; profile: string };
}

type ViewMode = "map" | "list";

function toQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

export function MapPageController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const { activeProfile } = useAccessibilityProfile();

  const [view, setView] = useState<ViewMode>("map");
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [features, setFeatures] = useState<MapFeatureReturn[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<"all" | LayerKind>("all");
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [realtimeFeatures, setRealtimeFeatures] = useState<MapFeatureReturn[]>([]);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [guidingLines, setGuidingLines] = useState<MapLineFeature[]>([]);

  const profileKinds = useMemo(() => layersForProfile(activeProfile), [activeProfile]);

  const origin = currentLocation ?? null;

  const loadPlaces = useCallback(
    async (q: string, asOfOrigin: LatLng | null) => {
      try {
        const url = `/api/places${toQuery({ q: q || undefined, lat: asOfOrigin?.lat, lng: asOfOrigin?.lng })}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Gagal memuat data tempat.");
        const body = (await response.json()) as PlacesResponse;
        setPlaces(body.data.places);
        setSource(body.data.source);
        announceLiveRegion(
          q
            ? `Pencarian selesai. ${body.data.places.length} hasil ditemukan.`
            : `${body.data.places.length} tempat terdekat dimuat.`,
        );
      } catch {
        setError("Tidak dapat memuat data tempat. Coba lagi beberapa saat.");
      } finally {
        setLoadingPlaces(false);
      }
    },
    [],
  );

  const loadFeatures = useCallback(
    async (profile: typeof activeProfile) => {
      if (!profile) return;
      try {
        const response = await fetch(`/api/map/features?profile=${profile}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Gagal memuat fitur peta.");
        const body = (await response.json()) as FeaturesResponse;
        setFeatures(body.data.features);
      } catch {
        setError((prev) => prev ?? "Tidak dapat memuat fitur peta.");
      } finally {
        setLoadingFeatures(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await loadPlaces(submittedQuery, origin);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [loadPlaces, submittedQuery, origin]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await loadFeatures(activeProfile);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [loadFeatures, activeProfile]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const center = currentLocation ?? { lat: -6.2003, lng: 106.877 };
      setRealtimeLoading(true);
      try {
        const { fetchRealtimeAccessibility, fetchGuidingLines, bboxFromCenter } = await import("@/lib/realtimeOverpass");
        const bbox = bboxFromCenter(center.lat, center.lng);
        const [feats, lines] = await Promise.all([fetchRealtimeAccessibility(bbox), fetchGuidingLines(bbox)]);
        if (!cancelled) setRealtimeFeatures(feats);
        if (!cancelled) setGuidingLines(lines);
        if (feats.length > 0) announceLiveRegion(`${feats.length} data realtime OSM dimuat.`, { assertive: true });
        if (lines.length > 0) announceLiveRegion(`${lines.length} jalur guiding block ditemukan di sekitar peta.`);
      } catch { if (!cancelled) { setRealtimeFeatures([]); setGuidingLines([]); } } finally { if (!cancelled) setRealtimeLoading(false); }
    }
    void run();
    return () => { cancelled = true; };
  }, [currentLocation]);

  const handleSearch = (q: string) => {
    setLoadingPlaces(true);
    setError(null);
    setSubmittedQuery(q);
    announceLiveRegion(q ? "Mencari lokasi." : "Memuat tempat terdekat.");
  };

  const locate = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      announceLiveRegion("Lokasi otomatis tidak didukung. Atur posisi secara manual di daftar hasil.", {
        assertive: true,
      });
      setCurrentLocationLabel("Lokasi tidak tersedia — atur manual");
      setLoadingPlaces(false);
      return;
    }
    setLocating(true);
    setLoadingPlaces(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setCurrentLocationLabel(
          `Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`,
        );
        announceLiveRegion("Lokasi ditemukan. Peta dipusatkan ke lokasimu.", { assertive: true });
        setLocating(false);
      },
      () => {
        announceLiveRegion("Izin lokasi ditolak. Atur posisi secara manual di daftar hasil.", {
          assertive: true,
        });
        setCurrentLocationLabel("Lokasi tidak tersedia — atur manual");
        setLocating(false);
        setLoadingPlaces(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const applyPlaceAsOrigin = (place: PlaceSummary) => {
    setLoadingPlaces(true);
    setError(null);
    setCurrentLocation({ lat: place.lat, lng: place.lng });
    setCurrentLocationLabel(`${place.name} sebagai titik awal`);
    announceLiveRegion(`Lokasi awal: ${place.name}.`);
    setView("map");
  };

  const navigateHere = (place: PlaceSummary) => {
    const c = currentLocation ?? { lat: -6.2003, lng: 106.877 };
    const fromLabel = currentLocationLabel ?? "Lokasi saya";
    announceLiveRegion(`Membuka navigasi rute menuju ${place.name}.`);
    router.push(
      `/journey?route=route-maj&from=${encodeURIComponent(fromLabel)}&to=${encodeURIComponent(place.name)}&destination=${encodeURIComponent(place.id)}&lat=${c.lat}&lng=${c.lng}`,
    );
  };

  const featuredKinds = activeLayer === "all" ? profileKinds : [activeLayer];
  const visibleFeatures = features.filter((f) => featuredKinds.includes(f.kind as LayerKind));
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;
  const selectedScore = selectedPlace ? summaryScore(selectedPlace, activeProfile) : null;

  const toggleView = (next: ViewMode) => {
    setView(next);
    announceLiveRegion(next === "list" ? "Tampilan daftar aktif. Semua informasi tersedia sebagai teks." : "Tampilan peta aktif.", { assertive: true });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 font-black tracking-tight">Peta Aksesibilitas 3D Realtime</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Peta 3D gratis (OpenFreeMap) + data realtime OSM. Bagi tunanetra: gunakan <strong>tombol Daftar</strong> — semua info tersedia sebagai teks yang bisa dibaca screen reader & keyboard.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {realtimeLoading ? "Memuat data realtime…" : realtimeFeatures.length > 0 ? `${realtimeFeatures.length} titik realtime OSM aktif` : "Menampilkan data komunitas. Realtime akan muncul otomatis."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <TourTrigger feature="map" />
          <div role="group" aria-label="Tampilan peta atau daftar" className="flex rounded-14 border-2 border-border bg-card p-1 shadow-soft">
            <button
              type="button"
              aria-pressed={view === "map"}
              onClick={() => toggleView("map")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-12 px-4 py-2 text-sm font-bold",
                view === "map" ? "primary-solid text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              Peta
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => toggleView("list")}
              data-tour="map-list"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-12 px-4 py-2 text-sm font-bold",
                view === "list" ? "primary-solid text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              Daftar
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row">
        <section className="min-w-0 flex-1" aria-label="Peta dan fitur">
          <div className="flex flex-wrap items-center gap-2 rounded-20 border-2 border-border bg-card p-3 shadow-card" data-tour="map-tools">
            <div className="min-w-56 flex-1">
              <SearchInput
                onSearch={handleSearch}
                label="Cari tempat"
                placeholder="Cari tempat, kategori, atau jalan…"
                initialQuery={initialQuery}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Filter layer peta</span>
              <select
                value={activeLayer}
                onChange={(e) => setActiveLayer(e.target.value === "all" ? "all" : (e.target.value as LayerKind))}
                className="h-12 rounded-14 border-2 border-input bg-background px-3 font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Semua layer</option>
                {profileKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {LAYERS[kind].label}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="outline" size="sm" onClick={locate} loading={locating}>
              <Navigation className="h-4 w-4" aria-hidden="true" />
              Lokasi saya
            </Button>
          </div>

          {currentLocationLabel ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Posisi awal: {currentLocationLabel}.{" "}
              {!currentLocation ? (
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={locate}
                >
                  Coba lagi
                </button>
              ) : null}
            </p>
          ) : null}

          <div className="mt-3">
            {view === "map" ? (
              <Accessible3DMap
                places={places}
                features={visibleFeatures}
                realtimeFeatures={realtimeFeatures}
                guidingLines={guidingLines}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={setSelectedPlaceId}
                currentLocation={currentLocation}
                onLocate={locate}
              />
            ) : (
              <section aria-label="Daftar fitur aksesibilitas" className="space-y-2">
                <h2 className="sr-only">Daftar fitur aksesibilitas terdekat</h2>
                {loadingFeatures ? (
                  <p className="rounded-16 border border-border bg-card p-4 text-sm text-muted-foreground">Memuat fitur…</p>
                ) : (
                  <FeatureList
                    features={visibleFeatures}
                    onSelect={(placeId) => setSelectedPlaceId(placeId)}
                  />
                )}
                {visibleFeatures.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {visibleFeatures.length} fitur dari {profileKinds.length} layer.
                  </p>
                ) : null}
              </section>
            )}
          </div>
        </section>

        <aside className="w-full space-y-4 lg:w-80" aria-label="Hasil dan detail">
          <div className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
            <h2 className="text-h3 font-black">
              {submittedQuery ? <>Hasil untuk &quot;{submittedQuery}&quot;</> : "Tempat di sekitar"}
            </h2>
            {loadingPlaces ? (
              <p className="mt-3 text-sm text-muted-foreground">Mencari lokasi…</p>
            ) : error ? (
              <p className="mt-3 rounded-12 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : (
<div className="mt-3" data-tour="map-canvas">
                <ResultList places={places} profile={activeProfile} selectedPlaceId={selectedPlaceId} onPreview={setSelectedPlaceId} />
              </div>
            )}
          </div>

          {selectedPlace ? (
            <section className="rounded-20 border-2 border-primary bg-card p-4 shadow-card" aria-label={`Detail ${selectedPlace.name}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black leading-snug">{selectedPlace.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedPlace.address}</p>
                  {selectedPlace.distanceLabel ? (
                    <p className="mt-1 text-sm text-muted-foreground">Jarak: {selectedPlace.distanceLabel}</p>
                  ) : null}
                  {selectedScore ? (
                    <p className="mt-2 inline-block rounded-10 border-2 border-foreground/40 bg-muted px-2.5 py-1 text-sm font-bold">
                      {selectedScore.score != null ? `${selectedScore.score.toFixed(0)}/100 ` : ""}
                      {selectedScore.label}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`Tutup detail ${selectedPlace.name}`}
                  onClick={() => setSelectedPlaceId(null)}
                  className="rounded-8 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigateHere(selectedPlace)}>
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Rute &amp; navigasi ke sini
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/places/${selectedPlace.id}`)}>
                  Lihat detail lengkap
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPlaceAsOrigin(selectedPlace)}>
                  Jadikan titik awal
                </Button>
              </div>
            </section>
          ) : null}

          {!currentLocation && !loadingPlaces ? (
            <section className="rounded-20 border-2 border-border bg-card p-4 shadow-card" aria-labelledby="manual-origin-heading">
              <h2 id="manual-origin-heading" className="text-h3 font-black">
                Atur lokasi awal manual
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Jika izin lokasi tidak tersedia, pilih salah satu tempat sebagai titik awal.
              </p>
              <select
                aria-label="Pilih titik awal"
                className="mt-3 h-12 w-full rounded-14 border-2 border-input bg-background px-3 font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => {
                  const place = places.find((p) => p.id === e.target.value);
                  if (place) applyPlaceAsOrigin(place);
                }}
                value=""
              >
                <option value="" disabled>
                  Pilih tempat…
                </option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          {source === "demo" ? (
            <p className="rounded-12 border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
              <strong>Data demo.</strong> Angka dan label ini contoh untuk pengembangan, bukan kondisi
              nyata lapangan.
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Sumber data:{" "}
            {source === "demo" ? "data demo lokal" : source === "database" ? "database" : "memuat…"}.{" "}
            <Link href="/onboarding" className="font-medium text-primary underline-offset-2 hover:underline">
              Ubah profil aksesibilitas
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}