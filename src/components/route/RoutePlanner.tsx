"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Crosshair, MapPin, Navigation2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { RouteResultCard } from "@/components/route/RouteResultCard";
import { announceLiveRegion } from "@/lib/announcement";
import { ACCESSIBILITY_PROFILES } from "@/lib/constants";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import type { PlaceSummary, RouteOption } from "@/types";
import { cn } from "@/lib/cn";

interface PlacesResponse {
  ok: boolean;
  data: { places: PlaceSummary[] };
}

interface RoutesResponse {
  ok: boolean;
  data: { routes: RouteOption[]; real?: boolean };
  error?: { code: string; message: string };
}

interface Origin {
  lat: number;
  lng: number;
  name: string;
}

export function RoutePlanner() {
  const { activeProfile } = useAccessibilityProfile();
  const searchParams = useSearchParams();
  const presetTo = searchParams.get("to");
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [originManualOpen, setOriginManualOpen] = useState(false);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destination, setDestination] = useState<PlaceSummary | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [searching, setSearching] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [realStreet, setRealStreet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestRef = useRef<HTMLUListElement>(null);

  const profileMeta = ACCESSIBILITY_PROFILES.find((p) => p.value === activeProfile);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/places", { cache: "no-store" });
        if (!response.ok) throw new Error("fail");
        const body = (await response.json()) as PlacesResponse;
        if (!cancelled) setPlaces(body.data.places);
      } catch {
        if (!cancelled) setError("Tidak dapat memuat daftar lokasi.");
      } finally {
        if (!cancelled) setLoadingPlaces(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const presetPlace = useMemo(() => {
    if (!presetTo) return null;
    return places.find((p) => p.name === presetTo) ?? null;
  }, [places, presetTo]);

  const effectiveDestination = destination ?? presetPlace;

  const suggestions = useMemo(() => {
    const q = destinationQuery.trim().toLowerCase();
    if (!q) return places.slice(0, 6);
    return places.filter((p) => `${p.name} ${p.address} ${p.city}`.toLowerCase().includes(q)).slice(0, 6);
  }, [places, destinationQuery]);

  const useCurrentLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      announceLiveRegion("Lokasi otomatis tidak didukung. Pilih lokasi awal secara manual.", { assertive: true });
      setOriginManualOpen(true);
      return;
    }
    announceLiveRegion("Mencari lokasi saat ini.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: Origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: "Lokasiku",
        };
        setOrigin(next);
        setOriginManualOpen(false);
        announceLiveRegion(`Lokasi awal ditetapkan: ${next.name}.`, { assertive: true });
      },
      () => {
        announceLiveRegion("Izin lokasi ditolak. Pilih lokasi awal secara manual.", { assertive: true });
        setOriginManualOpen(true);
      },
    );
  };

  const selectOriginPlace = (place: PlaceSummary) => {
    setOrigin({ lat: place.lat, lng: place.lng, name: place.name });
    setOriginManualOpen(false);
    announceLiveRegion(`Lokasi awal: ${place.name}.`);
  };

  const selectDestination = (place: PlaceSummary) => {
    setDestination(place);
    setDestinationQuery(place.name);
    setSuggestOpen(false);
    announceLiveRegion(`Tujuan: ${place.name}.`);
  };

  const search = async () => {
    if (!origin || !effectiveDestination || !activeProfile) return;
    setSearching(true);
    setError(null);
    setRoutes(null);
    announceLiveRegion("Mencari rute yang dapat diakses.");
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: origin.lat, lng: origin.lng },
          originName: origin.name,
          destinationId: effectiveDestination.id,
          profile: activeProfile,
        }),
      });
      const body = (await response.json()) as RoutesResponse;
      if (!response.ok || !body.data) {
        const message = body.error?.message ?? "Gagal mencari rute.";
        setError(message);
        announceLiveRegion(message, { assertive: true });
        return;
      }
      setRoutes(body.data.routes);
      setRealStreet(body.data.real === true);
      announceLiveRegion(`${body.data.routes.length} pilihan rute ditemukan. Rute paling aksesibel direkomendasikan.`, {
        assertive: true,
      });
    } catch {
      setError("Rute belum dapat dibuat untuk lokasi ini. Silakan coba lokasi lain.");
      announceLiveRegion("Gagal mencari rute.", { assertive: true });
    } finally {
      setSearching(false);
    }
  };

  const canSearch = origin !== null && effectiveDestination !== null && activeProfile !== null;

  if (loadingPlaces) {
    return <LoadingState label="Memuat data lokasi." />;
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="route-inputs" className="space-y-5 rounded-20 border-2 border-border bg-card p-4 shadow-card sm:p-6">
        <h2 id="route-inputs" className="text-h3 font-black">
          Rencanakan rute
        </h2>

        <div>
          <p className="text-sm font-black">Dari</p>
          {origin ? (
            <p className="mt-2 flex items-center gap-2 rounded-14 border-2 border-border bg-background px-3 py-3 text-sm">
              <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-bold">{origin.name}</span>
              <button
                type="button"
                className="text-primary underline underline-offset-2 hover:text-primary-hover"
                onClick={() => setOriginManualOpen((open) => !open)}
              >
                Ubah
              </button>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Belum dipilih.</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant={origin?.name === "Lokasiku" ? "secondary" : "outline"} size="sm" onClick={useCurrentLocation}>
              <Crosshair className="h-4 w-4" aria-hidden="true" />
              Lokasiku
            </Button>
            {places.slice(0, 6).map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => selectOriginPlace(place)}
                aria-pressed={origin?.name === place.name}
                className={cn(
                  "rounded-12 border-2 border-border bg-background px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted",
                  origin?.name === place.name && "border-primary bg-primary-soft text-primary",
                )}
              >
                {place.name}
              </button>
            ))}
          </div>

          {originManualOpen && origin === null ? (
            <p className="mt-2 text-sm text-muted-foreground">Pilih salah satu lokasi di atas untuk menjadi titik awal.</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="route-to" className="text-sm font-black">
            Ke tujuan
          </label>
          <div className="relative mt-2">
            <Input
              id="route-to"
              value={destinationQuery || presetPlace?.name || ""}
              onChange={(event) => {
                setDestinationQuery(event.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSuggestOpen(false);
              }}
              placeholder="Cari tempat tujuan…"
              autoComplete="off"
            />
            {suggestOpen && destinationQuery.trim().length > 0 && suggestions.length > 0 ? (
              <ul
                ref={suggestRef}
                role="listbox"
                aria-label="Hasil pencarian tujuan"
                className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-14 border-2 border-border bg-card p-1 shadow-float"
              >
                {suggestions.map((place) => (
                  <li key={place.id} role="option" aria-selected={destination?.id === place.id}>
                    <button
                      type="button"
                      className="w-full rounded-12 px-3 py-2.5 text-left text-sm hover:bg-muted"
                      onClick={() => selectDestination(place)}
                    >
                      <span className="block font-bold">{place.name}</span>
                      <span className="block text-xs text-muted-foreground">{place.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {effectiveDestination ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Tujuan: {effectiveDestination.name}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">
            Untuk:{" "}
            {profileMeta ? (
              <span className="inline-flex items-center gap-1.5 rounded-8 bg-muted px-2.5 py-1 text-sm font-semibold text-muted-foreground">
                <profileMeta.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {profileMeta.label}
              </span>
            ) : (
              <span className="text-muted-foreground">belum dipilih</span>
            )}
          </p>
          {!activeProfile ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih profil aksesibilitas di halaman{" "}
              <Link href="/onboarding" className="text-primary underline-offset-2 hover:underline">
                onboarding
              </Link>{" "}
              agar rute dipersonalisasi.
            </p>
          ) : null}
        </div>

        <Button className="w-full" size="lg" onClick={() => void search()} loading={searching} disabled={!canSearch || searching}>
          <Navigation2 className="h-5 w-5" aria-hidden="true" />
          Cari Rute
        </Button>

        {!canSearch ? (
          <p className="text-sm text-muted-foreground border-2 border-border bg-muted rounded-12 px-4 py-3" aria-live="polite">
            {!origin ? "Pilih titik awal untuk melanjutkan." : !effectiveDestination ? "Pilih tujuan untuk melanjutkan." : !activeProfile ? "Pilih profil aksesibilitas untuk melanjutkan." : ""}
          </p>
        ) : null}
      </section>

      {searching ? <LoadingState label="Mencari rute yang dapat diakses..." /> : null}

      {error ? (
        <ErrorState
          title="Rute belum tersedia"
          description={error}
          action={
            <button
              type="button"
              onClick={() => setError(null)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-12 border border-border bg-background px-5 font-medium text-foreground hover:bg-muted"
            >
              Coba lagi
            </button>
          }
        />
      ) : null}

      {!error && routes !== null ? (
        routes.length > 0 ? (
          <section aria-label="Pilihan rute" className="space-y-4">
            <p className="sr-only" aria-live="polite">
              Pilihan rute siap.
            </p>
            <p className="rounded-12 border-2 border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-card">
              {realStreet
                ? "Rute mengikuti jaringan jalan nyata (OpenStreetMap) dan disesuaikan dengan hambatan yang dianalisis."
                : "Rute memperkirakan jaringan jalan dari data demo. Jalur mengikuti jalan nyata dengan lebih presisi saat data navigasi jalan tersedia."}
            </p>
            {routes.map((route) => (
              <RouteResultCard key={route.id} route={route} />
            ))}
          </section>
        ) : (
          <EmptyState
            title="Tidak ada alternatif rute"
            description="Belum ada data aksesibilitas yang cukup untuk menyusun rute di area ini. Coba lokasi lain."
            action={
              <Link
                href="/report"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                Laporkan hambatan
              </Link>
            }
          />
        )
      ) : null}
    </div>
  );
}