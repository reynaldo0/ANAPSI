"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkX, MapPin, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { announceLiveRegion } from "@/lib/announcement";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/state/AuthContext";
import type { SavedPlaceRecord } from "@/lib/data/saved";

interface ApiResponse {
  ok: boolean;
  data?: { saved: SavedPlaceRecord[]; source: string };
  error?: { message: string };
}

interface RemoveResponse {
  ok: boolean;
  data?: { saved: boolean };
  error?: { message: string };
}

export function SavedPlacesList() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [places, setPlaces] = useState<SavedPlaceRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const loadSaved = useCallback(async () => {
    if (!user) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoadError(null);
    announceLiveRegion("Memuat tempat tersimpan…");

    try {
      const res = await fetch("/api/saved", { signal: ac.signal, cache: "no-store" });
      const body = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(body.error?.message ?? "Gagal memuat.");
      const list = body.data?.saved ?? [];
      setPlaces(list);
      announceLiveRegion(
        list.length === 0
          ? "Belum ada tempat tersimpan."
          : `${list.length} tempat tersimpan dimuat.`,
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Gagal memuat tempat tersimpan.";
      setLoadError(msg);
      announceLiveRegion(msg, { assertive: true });
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      const id = window.setTimeout(() => { void loadSaved(); }, 0);
      return () => window.clearTimeout(id);
    }
  }, [authLoading, loadSaved]);

  const handleRemove = async (placeId: string, placeName: string) => {
    setRemoving((prev) => new Set(prev).add(placeId));
    announceLiveRegion(`Menghapus ${placeName} dari tempat tersimpan…`);
    try {
      const res = await fetch(`/api/saved?placeId=${encodeURIComponent(placeId)}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as RemoveResponse;
      if (!res.ok) throw new Error(body.error?.message ?? "Gagal menghapus.");
      setPlaces((prev) => (prev ? prev.filter((p) => p.placeId !== placeId) : prev));
      toast({ tone: "success", title: "Dihapus", message: `${placeName} dihapus dari favorit.` });
      announceLiveRegion(`${placeName} dihapus dari tempat tersimpan.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus tempat.";
      toast({ tone: "danger", title: "Gagal", message: msg });
      announceLiveRegion(msg, { assertive: true });
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    }
  };

  if (authLoading) return <LoadingState label="Memeriksa sesi…" />;

  if (!user) {
    return (
      <div className="rounded-16 border border-border bg-card p-6 shadow-card">
        <p className="text-muted-foreground">
          Kamu perlu masuk untuk melihat tempat yang sudah disimpan.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 border border-border bg-background px-5 font-medium text-foreground transition-colors hover:bg-muted"
          >
            Daftar
          </Link>
        </div>
      </div>
    );
  }

  if (places === null && !loadError) return <LoadingState label="Memuat tempat tersimpan…" />;

  if (loadError) {
    return (
      <div className="rounded-16 border border-danger bg-danger-soft p-6 text-center">
        <p className="font-semibold text-danger">Gagal memuat</p>
        <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void loadSaved()}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!places || places.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="h-10 w-10" />}
        title="Belum ada tempat tersimpan"
        description="Simpan tempat dari halaman detail untuk mengaksesnya dengan cepat nanti."
        action={
          <Link
            href="/map"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Jelajahi Peta
          </Link>
        }
      />
    );
  }

  return (
    <ul
      className="divide-y divide-border rounded-16 border border-border bg-card shadow-card"
      aria-label={`Tempat tersimpan (${places.length} tempat)`}
    >
      {places.map((place) => (
        <li key={place.id} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{place.placeName}</p>
            {place.placeAddress ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{place.placeAddress}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted-foreground">
              Disimpan{" "}
              {new Date(place.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/places/${place.placeId}`}
              aria-label={`Lihat detail ${place.placeName}`}
              className="flex h-9 w-9 items-center justify-center rounded-8 border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              aria-label={`Hapus ${place.placeName} dari tempat tersimpan`}
              disabled={removing.has(place.placeId)}
              onClick={() => void handleRemove(place.placeId, place.placeName)}
              className="flex h-9 w-9 items-center justify-center rounded-8 border border-border text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            >
              <BookmarkX className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
