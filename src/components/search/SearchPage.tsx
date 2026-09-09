"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, ArrowRight } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { announceLiveRegion } from "@/lib/announcement";
import { cn } from "@/lib/cn";
import type { PlaceSummary } from "@/types";

interface PlacesApiResponse {
  ok: boolean;
  data?: { places: PlaceSummary[]; source: string };
  error?: { message: string };
}

export function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("demo");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setResults(null);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);
    announceLiveRegion("Mencari lokasi…");

    try {
      const url = `/api/places?q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
      const body = (await res.json()) as PlacesApiResponse;
      if (!res.ok) throw new Error(body.error?.message ?? "Pencarian gagal.");
      const places = body.data?.places ?? [];
      setResults(places);
      setSource(body.data?.source ?? "demo");
      announceLiveRegion(
        places.length === 0
          ? "Tidak ada hasil pencarian."
          : `Pencarian selesai. ${places.length} hasil ditemukan.`,
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Pencarian gagal. Coba lagi.";
      setError(msg);
      announceLiveRegion(msg, { assertive: true });
    } finally {
      setLoading(false);
    }
  }, []);

  // Run search when query (committed) changes
  useEffect(() => {
    if (query) {
      const id = window.setTimeout(() => { void doSearch(query); }, 0);
      return () => window.clearTimeout(id);
    }
  }, [query, doSearch]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftQuery.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    // Update URL without navigation for shareability
    const url = new URL(window.location.href);
    url.searchParams.set("q", trimmed);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleClear = () => {
    setDraftQuery("");
    setQuery("");
    setResults(null);
    setError(null);
    inputRef.current?.focus();
    announceLiveRegion("Pencarian dihapus.");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* Search form */}
      <form
        role="search"
        aria-label="Cari lokasi aksesibel"
        onSubmit={handleSubmit}
        className="mb-6"
      >
        <div className="relative flex items-center">
          <label htmlFor="search-input" className="sr-only">
            Cari lokasi
          </label>
          <span
            className="pointer-events-none absolute left-3.5 text-muted-foreground"
            aria-hidden="true"
          >
            <Search className="h-5 w-5" />
          </span>
          <input
            ref={inputRef}
            id="search-input"
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Cari nama tempat, kawasan, atau kategori…"
            aria-label="Cari lokasi"
            className={cn(
              "h-14 w-full rounded-16 border border-input bg-background pl-11 pr-24 text-base text-foreground",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          />
          <div className="absolute right-2 flex gap-1.5">
            {draftQuery.length > 0 ? (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={handleClear}
                className="h-9 rounded-8 px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Hapus
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="Mulai pencarian"
              className="h-9 rounded-8 bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
              disabled={draftQuery.trim().length === 0}
            >
              Cari
            </button>
          </div>
        </div>
      </form>

      {/* Status */}
      {loading ? (
        <LoadingState label="Mencari lokasi…" />
      ) : error ? (
        <div
          role="alert"
          className="rounded-16 border border-danger bg-danger-soft p-5 text-center"
        >
          <p className="font-semibold text-danger">Pencarian gagal</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void doSearch(query)}
            className="mt-3 rounded-8 border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Coba lagi
          </button>
        </div>
      ) : results === null ? (
        /* Initial state — no search yet */
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cari nama tempat, kawasan, atau kategori seperti &quot;kampus&quot;, &quot;puskesmas&quot;, atau &quot;cafe&quot;.
          </p>
          <div className="rounded-16 border border-border bg-card p-4 shadow-soft">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">Saran pencarian</p>
            <ul className="flex flex-wrap gap-2">
              {["Universitas", "Puskesmas", "Rumah Sakit", "Stasiun", "Mall"].map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftQuery(tag);
                      setQuery(tag);
                    }}
                    className="rounded-8 border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary-soft hover:text-primary"
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="Tidak ada hasil"
          description={`Tidak ada tempat yang cocok dengan "${query}". Coba kata kunci lain.`}
          action={
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-10 items-center gap-2 rounded-12 bg-primary-soft px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Cari ulang
            </button>
          }
        />
      ) : (
        /* Results */
        <section aria-labelledby="results-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="results-heading" className="text-sm font-semibold text-muted-foreground">
              {results.length} hasil untuk &ldquo;{query}&rdquo;
            </h2>
            {source === "demo" ? (
              <span className="rounded-8 bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                Data demo
              </span>
            ) : null}
          </div>
          <ul className="divide-y divide-border rounded-16 border border-border bg-card shadow-card">
            {results.map((place) => (
              <li key={place.id}>
                <Link
                  href={`/places/${place.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  aria-label={`${place.name}, ${place.address || place.city}${place.distanceLabel ? `, jarak ${place.distanceLabel}` : ""}`}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-primary-soft text-primary"
                    aria-hidden="true"
                  >
                    <MapPin className="h-5 w-5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{place.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {place.address ? `${place.address}, ` : ""}
                      {place.city}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{place.category}</Badge>
                      {place.distanceLabel ? (
                        <span className="text-xs text-muted-foreground">
                          {place.distanceLabel}
                        </span>
                      ) : null}
                      {place.score ? (
                        <>
                          {place.score.visual !== null ? (
                            <span className="text-xs text-muted-foreground">
                              👁 {Math.round(place.score.visual)}
                            </span>
                          ) : null}
                          {place.score.mobility !== null ? (
                            <span className="text-xs text-muted-foreground">
                              ♿ {Math.round(place.score.mobility)}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </span>
                  </span>

                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
