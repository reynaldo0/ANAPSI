"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/lib/state/AuthContext";
import type { AdminPlace } from "@/types";

function scoreBadge(score: number | null) {
  if (score == null) return { label: "Belum dinilai", tone: "neutral" as const };
  if (score >= 80) return { label: `${score} · Sangat aksesibel`, tone: "success" as const };
  if (score >= 60) return { label: `${score} · Aksesibel sebagian`, tone: "success" as const };
  if (score >= 40) return { label: `${score} · Terbatas`, tone: "warning" as const };
  return { label: `${score} · Hambatan`, tone: "danger" as const };
}

export function AdminPlacesTab() {
  const { loading: authLoading } = useAuth();
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const fetchPlaces = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/places", { signal: ac.signal });
      const body = await res.json();
      if (!body.ok) throw new Error(body.error?.message ?? "Gagal memuat tempat.");
      setPlaces(body.data.places as AdminPlace[]);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Gagal memuat tempat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchPlaces(), 0);
    return () => window.clearTimeout(id);
  }, [fetchPlaces]);

  const filtered = query.trim()
    ? places.filter((p) =>
        `${p.name} ${p.address} ${p.city} ${p.category}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : places;

  if (authLoading || loading) return <LoadingState label="Memuat tempat…" />;

  if (error) {
    return (
      <div className="rounded-16 border-2 border-danger bg-danger-soft p-6 text-center">
        <p className="text-lg font-bold text-danger">Gagal memuat tempat</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void fetchPlaces()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (places.length === 0) {
    return <EmptyState title="Katalog tempat kosong" description="Tempat demo belum dimuat ke database." />;
  }

  return (
    <div>
      <label htmlFor="admin-places-search" className="mb-1 block text-sm font-medium">
        Cari tempat
      </label>
      <input
        id="admin-places-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nama, alamat, atau kategori…"
        className="mb-4 w-full max-w-sm rounded-12 border-2 border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} dari {places.length} tempat.
      </p>

      <ul className="space-y-2.5" aria-label="Daftar tempat">
        {filtered.map((p) => {
          const vis = scoreBadge(p.visualScore);
          const mob = scoreBadge(p.mobilityScore);
          return (
            <li key={p.id} className="rounded-14 border-2 border-border bg-card p-3.5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{p.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {p.address || "—"} · {p.city}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.category} · {p.reports} laporan · {p.entrances} pintu masuk
                    {p.lat ? ` · ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={vis.tone} symbol="👁">
                    Visual: {vis.label}
                  </Badge>
                  <Badge tone={mob.tone} symbol="♿">
                    Kursi roda: {mob.label}
                  </Badge>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}