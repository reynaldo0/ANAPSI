"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, MapPin, Search, X } from "lucide-react";
import { announceLiveRegion } from "@/lib/announcement";
import { summaryScore } from "@/lib/data/places-core";
import { cn } from "@/lib/cn";
import type { LatLng } from "@/lib/geo";
import type { AccessibilityProfileType, PlaceSummary } from "@/types";

interface Props {
  open: boolean;
  origin: LatLng | null;
  profile: AccessibilityProfileType;
  onClose: () => void;
  onSelectPlace: (place: PlaceSummary) => void;
}

interface PlacesResponse {
  ok: boolean;
  data: { places: PlaceSummary[] };
}

const QUICK_CHIPS = [
  { label: "Semua", query: "" },
  { label: "Kesehatan", query: "Kesehatan" },
  { label: "Rumah Sakit", query: "Kesehatan" },
  { label: "Kuliner", query: "Kuliner" },
  { label: "Kafe", query: "kafe" },
  { label: "Transportasi", query: "Transportasi" },
  { label: "Pendidikan", query: "Pendidikan" },
  { label: "Rekreasi", query: "Rekreasi" },
];

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

export function DestinationSheet({ open, origin, profile, onClose, onSelectPlace }: Props) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const node = sheetRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trapTab);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", trapTab);
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const delay = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setFallback(false);
      try {
        const url = `/api/places${toQuery({ q: query, lat: origin?.lat, lng: origin?.lng })}`;
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Gagal memuat tempat.");
        const body = (await response.json()) as PlacesResponse;
        let results = body.data.places;
        if (results.length === 0 && query.trim().length > 0) {
          const fbUrl = `/api/places${toQuery({ lat: origin?.lat, lng: origin?.lng })}`;
          const fb = await fetch(fbUrl, { cache: "no-store" });
          if (fb.ok) {
            const fbBody = (await fb.json()) as PlacesResponse;
            results = fbBody.data.places;
            if (!cancelled) setFallback(true);
          }
        }
        if (!cancelled) setPlaces(results);
      } catch {
        if (!cancelled) {
          setPlaces([]);
          setError("Tidak dapat memuat tempat. Coba lagi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(delay);
    };
  }, [open, query, origin]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        announceLiveRegion("Pemilihan tujuan ditutup.");
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const choose = (place: PlaceSummary) => {
    announceLiveRegion(`${place.name} dipilih sebagai tujuan. Menghitung rute dan ringkasan risiko.`, { assertive: true });
    onSelectPlace(place);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Pilih tujuan perjalanan">
      <button
        type="button"
        aria-label="Tutup pemilihan tujuan"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
      />
      <div ref={sheetRef} className="relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-24 border border-border bg-card shadow-float animate-slide-up sm:mx-4 sm:mb-0 sm:max-w-xl sm:rounded-24">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-14 primary-solid text-primary-foreground">
              <Search className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="label-uppercase text-[11px] text-primary">Tujuan perjalanan</p>
              <h2 className="truncate text-lg font-black leading-tight">Mau ke mana?</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-12 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari tempat, kategori, atau jalan…"
              autoComplete="off"
              className="h-14 w-full rounded-16 border-2 border-input bg-background ps-12 pe-4 text-base font-semibold placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Kategori cepat">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setQuery(chip.query)}
                aria-pressed={query === chip.query}
                className={cn(
                  "shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors",
                  query === chip.query ? "border-primary bg-primary-soft text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3" aria-live="polite" aria-busy={loading}>
          {loading ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Mencari tempat…</p>
          ) : error ? (
            <p className="rounded-12 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : places.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MapPin className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-bold">Belum ada hasil</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Coba kata kunci lain atau pilih kategori di atas. Contoh: &quot;kesehatan&quot;, &quot;kafe&quot;, atau nama tempat.
              </p>
            </div>
          ) : (
            <>
              {fallback ? (
                <div className="mb-2 rounded-12 border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-warning">
                  Tidak ada tempat cocok dengan &quot;{query}&quot;. Ini yang terdekat sebagai gantinya:
                </div>
              ) : null}
              <ul className="space-y-2">
              {places.map((place) => {
                const score = summaryScore(place, profile);
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => choose(place)}
                      className="flex w-full items-center gap-3 rounded-16 border-2 border-border bg-background p-3 text-left transition-colors hover:border-primary focus-visible:outline-offset-2"
                    >
                      <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black">{place.name}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {place.category}
                          {place.distanceLabel ? ` · ${place.distanceLabel}` : ""}
                        </span>
                        {place.address ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{place.address}</span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-black",
                          score.score === null
                            ? "border-border text-muted-foreground"
                            : score.score >= 80
                              ? "border-success bg-success-soft text-success"
                              : score.score >= 40
                                ? "border-warning bg-warning-soft text-warning"
                                : "border-danger bg-danger-soft text-danger",
                        )}
                      >
                        <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
                        {score.score !== null ? `${score.score}` : "?"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </div>

        <footer className="border-t border-border px-4 py-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Accessibility className="h-4 w-4 shrink-0" aria-hidden="true" />
            Setelah memilih tujuan, kamu akan melihat ringkasan risiko rute sebelum mulai berjalan.
          </p>
        </footer>
      </div>
    </div>
  );
}