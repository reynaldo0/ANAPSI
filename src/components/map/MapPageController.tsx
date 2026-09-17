"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Accessibility,
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Home,
  Layers,
  List,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Menu,
  Navigation,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Accessible3DMap } from "@/components/map/Accessible3DMap";
import { DestinationSheet } from "@/components/map/DestinationSheet";
import { FeatureList } from "@/components/map/FeatureList";
import { ResultList } from "@/components/map/ResultList";
import { RiskSummaryPanel } from "@/components/map/RiskSummaryPanel";
import { TourTrigger } from "@/components/tutorial/TourTrigger";
import { announceLiveRegion } from "@/lib/announcement";
import { LAYERS, layersForProfile, type LayerKind } from "@/lib/data/layers";
import { summaryScore } from "@/lib/data/places-core";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { cn } from "@/lib/cn";
import { FOCUS_CENTER, FOCUS_REGION_LABEL, isOutsideFocus, type LatLng } from "@/lib/geo";
import type { MapFeatureReturn, MapLineFeature, PlaceSummary } from "@/types";
import type { GeoSuggestion } from "@/app/api/geo/suggest/route";

interface PlacesResponse {
  ok: boolean;
  data: { places: PlaceSummary[]; source: string };
}

interface FeaturesResponse {
  ok: boolean;
  data: { features: MapFeatureReturn[]; source: string; profile: string };
}

type ViewMode = "map" | "list";

const DOT_FOR: Record<LayerKind, string> = {
  guiding_block: "bg-yellow-500",
  pedestrian_crossing: "bg-emerald-500",
  audio_crossing_signal: "bg-sky-500",
  obstacle: "bg-red-500",
  surface_hazard: "bg-orange-500",
  ramp: "bg-emerald-600",
  stairs: "bg-red-600",
  elevator: "bg-indigo-500",
  path_width: "bg-teal-500",
  surface_condition: "bg-amber-600",
  accessible_entrance: "bg-green-600",
};

/** Zona vertikal yang dipakai overlay atas agar tidak saling menindih. */
const HERO_ROW_TOP = "top-32 sm:top-[4.75rem]";

const SIDE_PANEL_TOP = "top-[8.25rem]";
interface MenuItem {
  href: string;
  label: string;
  hint: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const MENU_ITEMS: MenuItem[] = [
  { href: "/", label: "Beranda", hint: "Kembali ke beranda ANAPSI", Icon: Home },
  { href: "/report", label: "Lapor masalah", hint: "Laporkan hambatan aksesibilitas", Icon: Megaphone },
  { href: "/community", label: "Komunitas", hint: "Statistik dan diskusi komunitas", Icon: Users },
  { href: "/profile", label: "Profil saya", hint: "Akun, laporan, dan lencana", Icon: UserRound },
  { href: "/saved", label: "Rute tersimpan", hint: "Tempat yang kamu simpan", Icon: Bookmark },
  { href: "/tutorial", label: "Tutorial", hint: "Pelajari cara memakai aplikasi", Icon: GraduationCap },
  { href: "/onboarding", label: "Ubah profil aksesibilitas", hint: "Ganti profil pendamping", Icon: Accessibility },
];

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
  const [realtimeFeatures, setRealtimeFeatures] = useState<MapFeatureReturn[]>([]);
  const [realtimeLoading, setRealtimeLoading] = useState(false);
  const [guidingLines, setGuidingLines] = useState<MapLineFeature[]>([]);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [layersOpen, setLayersOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(true);
  const [intro, setIntro] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [destination, setDestination] = useState<PlaceSummary | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusedPoint, setFocusedPoint] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  const profileKinds = useMemo(() => layersForProfile(activeProfile), [activeProfile]);
  const origin = currentLocation ?? null;

  useEffect(() => {
    const timer = setTimeout(() => finishIntro(), 3400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => locate(), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finishIntro(force = false) {
    if (leaving || !intro) return;
    setLeaving(true);
    if (force) announceLiveRegion("Memuat peta selesai.", { assertive: true });
    else announceLiveRegion("Blank spot peta siap. Ketuk 'Mau ke mana?' untuk memilih tujuan.", { assertive: true });
    setTimeout(() => setIntro(false), 520);
  }

  const openPicker = () => {
    setPickerOpen(true);
    announceLiveRegion("Pilih tujuan perjalanan. Ketik nama tempat atau pilih kategori.", { assertive: true });
  };

  const selectDestination = (place: PlaceSummary) => {
    setPickerOpen(false);
    setSelectedPlaceId(place.id);
    setDestination(place);
  };

  const closeDestination = () => {
    if (destination) announceLiveRegion("Ringkasan risiko ditutup. Kamu tetap bisa melihat lokasi tujuan di peta.", { assertive: true });
    setDestination(null);
  };

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
      const center = currentLocation ?? FOCUS_CENTER;
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

  const handleSearch = useCallback((q: string) => {
    setLoadingPlaces(true);
    setError(null);
    setSubmittedQuery(q);
    announceLiveRegion(q ? "Mencari lokasi." : "Memuat tempat terdekat.");
  }, []);

  const suggest = useCallback(
    async (q: string, asOfOrigin: LatLng | null) => {
      const url = `/api/geo/suggest${toQuery({ q: q || undefined, lat: asOfOrigin?.lat, lng: asOfOrigin?.lng })}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal memuat saran.");
      const body = (await response.json()) as { ok: boolean; data: { suggestions: GeoSuggestion[] } };
      return body.data;
    },
    [],
  );

  const pickSuggestion = useCallback((suggestion: GeoSuggestion) => {
    setFocusedPoint({ lat: suggestion.lat, lng: suggestion.lng, name: suggestion.name });
    if (suggestion.place) {
      setSelectedPlaceId(suggestion.place.id);
      announceLiveRegion(`${suggestion.name} dipilih di peta.`, { assertive: true });
    } else {
      announceLiveRegion(
        `Lokasi ${suggestion.name} ditandai di peta. Gunakan "Mau ke mana?" untuk membuat rute.`,
        { assertive: true },
      );
    }
  }, []);

  // Pencarian dari luar halaman (komando suara "cari ..." saat sudah di peta).
  useEffect(() => {
    const handler = (event: Event) => {
      const q = (event as CustomEvent<{ q?: string }>).detail?.q;
      if (typeof q === "string") handleSearch(q);
    };
    window.addEventListener("blindspot:voice-search", handler);
    return () => window.removeEventListener("blindspot:voice-search", handler);
  }, [handleSearch]);

  const locate = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      announceLiveRegion("Lokasi otomatis tidak didukung. Atur posisi secara manual di panel hasil.", {
        assertive: true,
      });
      setCurrentLocationLabel("Lokasi tidak tersedia — atur manual");
      setLoadingPlaces(false);
      return;
    }
    setLoadingPlaces(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const raw = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (isOutsideFocus(raw)) {
          announceLiveRegion(`Lokasimu di luar area fokus. Peta difokuskan ke ${FOCUS_REGION_LABEL}.`, {
            assertive: true,
          });
          setCurrentLocation(FOCUS_CENTER);
          setCurrentLocationLabel(`Area fokus ${FOCUS_REGION_LABEL}`);
        } else {
          setCurrentLocation(raw);
          setCurrentLocationLabel(
            `Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`,
          );
        }
        announceLiveRegion("Lokasi ditemukan. Peta dipusatkan ke lokasimu.", { assertive: true });
        finishIntro();
      },
      () => {
        announceLiveRegion("Izin lokasi ditolak. Atur posisi secara manual di panel hasil.", {
          assertive: true,
        });
        setCurrentLocationLabel("Lokasi tidak tersedia — atur manual");
        setLoadingPlaces(false);
        finishIntro(true);
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
    const c = currentLocation ?? FOCUS_CENTER;
    const fromLabel = currentLocationLabel ?? "Lokasi saya";
    announceLiveRegion(`Membuka navigasi rute menuju ${place.name}.`);
    router.push(
      `/journey?route=route-street&from=${encodeURIComponent(fromLabel)}&to=${encodeURIComponent(place.name)}&destination=${encodeURIComponent(place.id)}&lat=${c.lat}&lng=${c.lng}`,
    );
  };

  const toggleResults = () => {
    const next = !resultsOpen;
    setResultsOpen(next);
    announceLiveRegion(next ? "Panel hasil ditutup." : "Panel hasil dibuka. Daftar tempat tersedia.");
  };

  const toggleLayers = () => {
    const next = !layersOpen;
    setLayersOpen(next);
    announceLiveRegion(next ? "Panel layer ditutup." : "Panel layer dibuka.");
  };

  const toggleMobile = () => {
    const next = !mobileOpen;
    setMobileOpen(next);
    announceLiveRegion(next ? "Panel bawah ditutup." : "Panel bawah dibuka.");
  };

  const featuredKinds = activeLayer === "all" ? profileKinds : [activeLayer];
  const visibleFeatures = features.filter((f) => featuredKinds.includes(f.kind as LayerKind));
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null;
  const selectedScore = selectedPlace ? summaryScore(selectedPlace, activeProfile) : null;

  const toggleView = (next: ViewMode) => {
    setView(next);
    announceLiveRegion(next === "list" ? "Tampilan daftar aktif. Semua informasi tersedia sebagai teks." : "Tampilan peta aktif.", { assertive: true });
  };

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    announceLiveRegion("Menu utama dibuka. Pilih tujuan lain atau buka menu yang tersedia.");
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      if (document.activeElement === firstMenuItemRef.current) {
        menuButtonRef.current?.focus();
      }
      return;
    }
    firstMenuItemRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  const viewToggle = (
    <div role="group" aria-label="Tampilan peta atau daftar" className="flex shrink-0 rounded-14 border-2 border-border bg-background p-1">
      <button
        type="button"
        aria-pressed={view === "map"}
        onClick={() => toggleView("map")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-12 px-2.5 py-2 text-sm font-bold sm:px-3",
          view === "map" ? "primary-solid text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
      >
        <MapIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Peta</span>
      </button>
      <button
        type="button"
        aria-pressed={view === "list"}
        onClick={() => toggleView("list")}
        data-tour="map-list"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-12 px-2.5 py-2 text-sm font-bold sm:px-3",
          view === "list" ? "primary-solid text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
      >
        <List className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Daftar</span>
      </button>
    </div>
  );

  const layersPanel = layersOpen ? (
    <div className="pointer-events-auto w-full rounded-20 border border-border/60 bg-card/85 p-3 shadow-float backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <p className="label-uppercase text-[11px] text-muted-foreground">
          Layer {activeLayer === "all" ? `· ${profileKinds.length}` : LAYERS[activeLayer].label}
        </p>
        <button
          type="button"
          onClick={toggleLayers}
          aria-expanded={layersOpen}
          aria-label="Tutup panel layer"
          className="flex h-9 w-9 items-center justify-center rounded-8 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="mt-2 space-y-1.5">
        {profileKinds.map((kind) => (
          <li key={kind}>
            <button
              type="button"
              onClick={() => setActiveLayer(activeLayer === kind ? "all" : kind)}
              aria-pressed={activeLayer === kind || activeLayer === "all"}
              className={cn(
                "flex w-full items-center gap-2 rounded-10 px-2 py-1.5 text-left text-sm font-semibold",
                activeLayer === kind || activeLayer === "all" ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT_FOR[kind])} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{LAYERS[kind].label}</span>
              <span className="text-xs font-bold tabular-nums text-muted-foreground">
                {features.filter((f) => f.kind === kind).length}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <button
      type="button"
      onClick={toggleLayers}
      aria-expanded={layersOpen}
      className="pointer-events-auto flex h-11 items-center gap-2 rounded-12 border border-border/60 bg-card/85 px-3 text-sm font-bold shadow-float backdrop-blur"
    >
      <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="label-uppercase text-[11px]">Layer</span>
    </button>
  );

  const resultsPanel = (
    <div className="pointer-events-auto flex flex-col overflow-hidden rounded-20 border border-border/60 bg-card/85 shadow-float backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="label-uppercase truncate text-[11px] text-muted-foreground">
          {selectedPlace ? "Detail tempat" : submittedQuery ? `Hasil: ${submittedQuery}` : "Tempat di sekitar"}
        </p>
        <button
          type="button"
          onClick={toggleResults}
          aria-expanded={resultsOpen}
          aria-label={resultsOpen ? "Tutup panel hasil" : "Buka panel hasil"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-8 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {resultsOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {resultsOpen ? (
        <div className="flex min-h-0 max-h-[calc(100dvh-13rem)] flex-col gap-3 overflow-y-auto p-3">
          {selectedPlace ? (
            <section className="rounded-16 border-2 border-primary bg-card p-3 shadow-card" aria-label={`Detail ${selectedPlace.name}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-black leading-snug">{selectedPlace.name}</h2>
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
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigateHere(selectedPlace)}>
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Rute &amp; navigasi ke sini
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push(`/places/${selectedPlace.id}`)}>
                  Detail lengkap
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPlaceAsOrigin(selectedPlace)}>
                  Jadikan titik awal
                </Button>
              </div>
            </section>
          ) : null}

          <section aria-label="Hasil tempat">
            {loadingPlaces ? (
              <p className="text-sm text-muted-foreground">Mencari lokasi…</p>
            ) : error ? (
              <p className="rounded-12 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : (
              <ResultList
                places={places}
                profile={activeProfile}
                selectedPlaceId={selectedPlaceId}
                onPreview={setSelectedPlaceId}
              />
            )}
          </section>

          {!currentLocation && !loadingPlaces ? (
            <section aria-labelledby="manual-origin-heading" className="rounded-16 border-2 border-border bg-card p-3">
              <h2 id="manual-origin-heading" className="text-sm font-black">
                Atur lokasi awal manual
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Jika izin lokasi tidak tersedia, pilih salah satu tempat sebagai titik awal.
              </p>
              <select
                aria-label="Pilih titik awal"
                className="mt-2 h-12 w-full rounded-14 border-2 border-input bg-background px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
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
            <p className="rounded-12 border border-warning bg-warning-soft px-3 py-2 text-xs text-warning">
              <strong>Data demo.</strong> Angka dan label ini contoh untuk pengembangan, bukan kondisi nyata
              lapangan.
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Sumber data:{" "}
            {source === "demo" ? "data demo lokal" : source === "database" ? "database" : "memuat…"}.{" "}
            <Link href="/onboarding" className="font-medium text-primary underline-offset-2 hover:underline">
              Ubah profil aksesibilitas
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-background"
      data-tour="map-canvas"
    >
      <h1 className="sr-only">Peta Aksesibilitas 3D Realtime</h1>

      {intro ? (
        <div
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center bg-background transition-all duration-500",
            leaving && "pointer-events-none -translate-y-3 opacity-0",
          )}
          role="status"
          aria-live="polite"
          aria-label="Memuat peta aksesibilitas"
        >
          <div className="animate-rise-in px-6 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-24 primary-solid text-primary-foreground shadow-float"
            >
              <Accessibility className="h-10 w-10 animate-pulse-dot" />
            </span>
            <h2 className="mt-6 text-3xl font-black tracking-tight">ANAPSI</h2>
            <p className="label-uppercase mt-1 text-xs text-primary">Peta Aksesibilitas 3D Realtime</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {leaving ? "Peta siap…" : "Mengambil lokasimu & mempersiapkan peta…"}
            </p>
            <button
              type="button"
              onClick={() => finishIntro(true)}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-14 border-2 border-border bg-card px-6 font-bold text-muted-foreground hover:bg-muted"
            >
              Lewati
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 animate-map-in">
          {view === "map" ? (
            <div className="absolute inset-0">
              <Accessible3DMap
                tall
                places={places}
                features={visibleFeatures}
                realtimeFeatures={realtimeFeatures}
                guidingLines={guidingLines}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={setSelectedPlaceId}
                currentLocation={currentLocation}
                onLocate={locate}
                focus={focusedPoint}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col bg-card">
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-12 primary-solid text-primary-foreground">
                  <Accessibility className="h-5 w-5" />
                </span>
                <p className="label-uppercase hidden text-[11px] text-primary sm:block">Daftar aksesibilitas</p>
                <div className="ml-auto">{viewToggle}</div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <section aria-label="Daftar fitur aksesibilitas" className="mx-auto max-w-3xl space-y-2">
                  {loadingFeatures ? (
                    <p className="rounded-16 border border-border bg-card p-4 text-sm text-muted-foreground">Memuat fitur…</p>
                  ) : (
                    <FeatureList features={visibleFeatures} onSelect={(placeId) => setSelectedPlaceId(placeId)} />
                  )}
                  {visibleFeatures.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Menampilkan {visibleFeatures.length} fitur dari {profileKinds.length} layer.
                    </p>
                  ) : null}
                </section>
              </div>
            </div>
          )}

          {view === "map" ? (
            <>
              {/* Bilah alat atas — membungkus aman: pencarian selalu punya ruang, tidak terpotong */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 border-b border-border/50 bg-card/90 px-2 py-2 shadow-soft backdrop-blur sm:gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 primary-solid text-primary-foreground sm:h-11 sm:w-11"
                  >
                    <Accessibility className="h-5 w-5" />
                  </span>
                  <div className="hidden shrink-0 lg:block">
                    <p className="label-uppercase text-[11px] leading-none text-primary">Peta Aksesibilitas</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">3D realtime</p>
                  </div>
                  <div className="order-2 min-w-0 flex-[1_1_100%] sm:order-none sm:min-w-40 sm:flex-[1_1_220px] lg:min-w-56">
                    <SearchInput
                      onSearch={handleSearch}
                      onSuggest={suggest}
                      suggestOrigin={origin}
                      onPickSuggestion={pickSuggestion}
                      label="Cari tempat"
                      placeholder="Cari tempat, kategori, atau jalan…"
                      initialQuery={initialQuery}
                    />
                  </div>
                  <label className="hidden h-12 shrink-0 items-center gap-2 rounded-14 border-2 border-input bg-background px-3 text-sm font-semibold xl:flex">
                    <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">Filter layer peta</span>
                    <select
                      value={activeLayer}
                      onChange={(e) => setActiveLayer(e.target.value === "all" ? "all" : (e.target.value as LayerKind))}
                      className="bg-transparent font-semibold focus:outline-none"
                    >
                      <option value="all">Semua layer</option>
                      {profileKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {LAYERS[kind].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {viewToggle}
                  <Button
                    ref={menuButtonRef}
                    variant="outline"
                    size="sm"
                    onClick={openMenu}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-controls="map-main-menu"
                    aria-label="Menu utama"
                    className="shrink-0 px-2.5"
                  >
                    <Menu className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                  <div className="hidden shrink-0 lg:block">
                    <TourTrigger feature="map" />
                  </div>
                </div>
              </div>

              {/* Menu utama (hamburger) — dropdown bersih, tidak menimpa panel saat tertutup */}
              {menuOpen ? (
                <div className="absolute inset-0 z-50">
                  <button
                    type="button"
                    aria-label="Tutup menu utama"
                    onClick={closeMenu}
                    className="fixed inset-0 cursor-default bg-black/10"
                  />
                  <nav
                    id="map-main-menu"
                    role="menu"
                    aria-label="Menu utama"
                    className="absolute right-2 top-32 w-72 max-w-[calc(100%-1rem)] overflow-hidden rounded-20 border border-border/60 bg-card/95 p-2 shadow-float backdrop-blur sm:top-[4.75rem]"
                  >
                    {MENU_ITEMS.map((item, index) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        ref={index === 0 ? firstMenuItemRef : undefined}
                        role="menuitem"
                        onClick={closeMenu}
                        className="flex items-center gap-3 rounded-12 px-3 py-2.5 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <item.Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{item.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                        </span>
                      </Link>
                    ))}
                    <div className="mt-1 border-t border-border/60 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={closeMenu}
                        className="flex w-full items-center gap-3 rounded-12 px-3 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Tutup menu
                      </button>
                    </div>
                  </nav>
                </div>
              ) : null}

              {/* "Mau ke mana?" — tombol tujuan utama, selalu di bawah bilah alat */}
              <div className={cn("pointer-events-none absolute inset-x-3 z-30 flex justify-center", HERO_ROW_TOP)}>
                <button
                  type="button"
                  onClick={openPicker}
                  data-tour="map-where-to"
                  className="pointer-events-auto flex h-14 w-full max-w-md items-center gap-3 rounded-full border border-border/60 bg-card/95 px-5 shadow-float backdrop-blur transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-base font-black text-foreground">Mau ke mana?</span>
                    <span className="block truncate text-xs text-muted-foreground">cari tempat · ketik atau perintah suara</span>
                  </span>
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              </div>

              {/* Panel sisi kiri (layer) — desktop, di bawah zona tombol utama */}
              <div className={cn("absolute left-3 z-20 hidden w-64 md:block", SIDE_PANEL_TOP)}>
                {layersPanel}
              </div>

              {/* Panel hasil kanan — desktop, di bawah zona tombol utama */}
              <div className={cn("absolute bottom-3 right-3 z-20 hidden w-80 max-w-[calc(100%-24px)] md:block", SIDE_PANEL_TOP)}>
                {resultsOpen || selectedPlace ? resultsPanel : (
                  <button
                    type="button"
                    onClick={toggleResults}
                    aria-expanded={resultsOpen}
                    className="pointer-events-auto ml-auto flex h-11 items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 text-sm font-bold shadow-float backdrop-blur"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    Tampilkan panel hasil
                  </button>
                )}
              </div>

              {/* Panel bawah (mobile) */}
              <div className="absolute inset-x-0 bottom-0 z-30 p-3 md:hidden">
                {mobileOpen ? (
                  <div className="pointer-events-auto overflow-hidden rounded-20 border border-border/60 bg-card/90 shadow-float backdrop-blur">
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                      <p className="label-uppercase truncate text-[11px] text-muted-foreground">
                        {selectedPlace ? "Detail tempat" : submittedQuery ? `Hasil: ${submittedQuery}` : "Tempat di sekitar"}
                      </p>
                      <button
                        type="button"
                        onClick={toggleMobile}
                        aria-expanded={mobileOpen}
                        aria-label="Tutup panel bawah"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="p-3">
                      {selectedPlace ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-black leading-snug">{selectedPlace.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedPlace.address}</p>
                            </div>
                            <button
                              type="button"
                              aria-label={`Tutup detail ${selectedPlace.name}`}
                              onClick={() => setSelectedPlaceId(null)}
                              className="rounded-8 p-1.5 text-muted-foreground hover:bg-muted"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => navigateHere(selectedPlace)}>
                              <Navigation className="h-4 w-4" aria-hidden="true" />
                              Rute ke sini
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/places/${selectedPlace.id}`)}>
                              Detail
                            </Button>
                          </div>
                        </>
                      ) : loadingPlaces ? (
                        <p className="text-xs text-muted-foreground">Mencari lokasi…</p>
                      ) : error ? (
                        <p className="text-xs text-danger" role="alert">
                          {error}
                        </p>
                      ) : places.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {places.map((place) => (
                            <button
                              key={place.id}
                              type="button"
                              onClick={() => setSelectedPlaceId(place.id)}
                              className="shrink-0 rounded-12 border-2 border-border bg-background px-3 py-2 text-left text-xs font-semibold"
                            >
                              {place.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Tidak ada hasil. Coba kata kunci lain atau tekan &quot;Lokasi saya&quot;.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={toggleMobile}
                      aria-expanded={mobileOpen}
                      className="pointer-events-auto flex h-11 max-w-full items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 text-sm font-bold shadow-float backdrop-blur"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{selectedPlace ? selectedPlace.name : "Daftar tempat"}</span>
                      <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              {/* Status bawah (desktop) */}
              <div className="pointer-events-none absolute bottom-40 left-3 z-10 hidden items-center gap-2 md:flex">
                <p className="pointer-events-auto rounded-12 border border-border/60 bg-card/85 px-3 py-1.5 text-xs text-muted-foreground shadow-float backdrop-blur">
                  {currentLocationLabel
                    ? `Posisi awal: ${currentLocationLabel}`
                    : "Geser peta untuk menjelajah. Buka 'Lokasi saya' atau panel kanan untuk daftar."}
                  {realtimeLoading ? null : realtimeFeatures.length > 0 ? ` · ${realtimeFeatures.length} titik realtime` : ""}
                  {guidingLines.length > 0 ? ` · ${guidingLines.length} jalur guiding block` : ""}
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}

      <DestinationSheet
        open={pickerOpen}
        origin={origin}
        profile={activeProfile ?? "WHEELCHAIR_MOBILITY"}
        onClose={() => {
          setPickerOpen(false);
          announceLiveRegion("Pemilihan tujuan ditutup.", { assertive: true });
        }}
        onSelectPlace={selectDestination}
      />

      {destination && activeProfile ? (
        <RiskSummaryPanel
          key={destination.id}
          place={destination}
          origin={origin ?? FOCUS_CENTER}
          fromLabel={currentLocationLabel ?? "Lokasi saya"}
          profile={activeProfile}
          onClose={closeDestination}
          onChangePlace={() => {
            setDestination(null);
            setPickerOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}