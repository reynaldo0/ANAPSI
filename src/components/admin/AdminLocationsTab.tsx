"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { announceLiveRegion } from "@/lib/announcement";
import { useAuth } from "@/lib/state/AuthContext";
import type { AdminLocation } from "@/types";

function relativeTime(iso: string | null): string {
  if (!iso) return "Belum ada lokasi";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

export function AdminLocationsTab() {
  const { loading: authLoading } = useAuth();
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLocations = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/locations", { signal: ac.signal });
      const body = await res.json();
      if (!body.ok) throw new Error(body.error?.message ?? "Gagal memuat lokasi.");
      setLocations(body.data.locations as AdminLocation[]);
      setError(null);
      setLastUpdated(new Date());
      announceLiveRegion(`Pemantauan lokasi diperbarui. ${(body.data.locations ?? []).length} pengguna berbagi lokasi.`);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Gagal memuat lokasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchLocations(), 0);
    const poll = window.setInterval(() => void fetchLocations(), 30_000);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(poll);
    };
  }, [fetchLocations]);

  if (authLoading || loading) return <LoadingState label="Memuat lokasi pengguna…" />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Menampilkan pengguna yang <strong className="text-foreground">mengizinkan berbagi lokasi</strong> (konsen aktif).
          Data disegarkan tiap 30 detik.
          {lastUpdated ? <span className="ml-1">Update terakhir: {lastUpdated.toLocaleTimeString("id-ID")}.</span> : null}
        </p>
        <Button size="sm" variant="outline" onClick={() => void fetchLocations()} disabled={loading}>
          Segarkan
        </Button>
      </div>

      {error ? (
        <div className="rounded-16 border-2 border-danger bg-danger-soft p-6 text-center">
          <p className="text-lg font-bold text-danger">Gagal memuat lokasi</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      ) : locations.length === 0 ? (
        <EmptyState
          title="Belum ada pengguna berbagi lokasi"
          description="Pengguna yang mengaktifkan konsen lokasi dan menggunakan aplikasi akan tampil di sini secara realtime."
        />
      ) : (
        <ul className="space-y-3" aria-label="Pemantauan lokasi pengguna">
          {locations.map((loc) => {
            const mapsUrl =
              loc.lastLat != null && loc.lastLng != null
                ? `https://www.google.com/maps?q=${loc.lastLat},${loc.lastLng}`
                : null;
            return (
              <li key={loc.id} className="rounded-16 border-2 border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{loc.displayName}</p>
                      {loc.online ? (
                        <Badge tone="success" symbol="●">
                          Online
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Pernah online</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{loc.email}</p>
                  </div>
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-14 border-2 border-border bg-background px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                    >
                      📍 Buka di Peta
                    </a>
                  ) : null}
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-12 bg-muted px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Koordinat
                    </dt>
                    <dd>
                      {loc.lastLat != null && loc.lastLng != null
                        ? `${loc.lastLat.toFixed(5)}°, ${loc.lastLng.toFixed(5)}°`
                        : "—"}
                    </dd>
                  </div>
                  <div className="rounded-12 bg-muted px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Halaman terakhir
                    </dt>
                    <dd>{loc.lastPage || "—"}</dd>
                  </div>
                  <div className="rounded-12 bg-muted px-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Lokasi dilaporkan
                    </dt>
                    <dd>{relativeTime(loc.lastActivityAt)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}