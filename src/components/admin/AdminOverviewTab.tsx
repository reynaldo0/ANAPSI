"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { announceLiveRegion } from "@/lib/announcement";
import { useAuth } from "@/lib/state/AuthContext";
import { useAdminStream, type AdminStreamSnapshot } from "@/lib/useAdminStream";
import type { AdminStats } from "@/types";

interface StatCardProps {
  label: string;
  value: number;
  tone?: "success" | "warning" | "danger";
  hint?: string;
}

function StatCard({ label, value, tone, hint }: StatCardProps) {
  const toneClass =
    tone === "danger"
      ? "border-danger-soft bg-danger-soft text-danger"
      : tone === "warning"
        ? "border-warning-soft bg-warning-soft text-warning"
        : tone === "success"
          ? "border-success-soft bg-success-soft text-success-foreground"
          : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-16 border-2 p-4 text-center shadow-soft ${toneClass}`}>
      <p className="text-3xl font-black leading-tight">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      {hint ? <p className="mt-1 text-xs opacity-80">{hint}</p> : null}
    </div>
  );
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function relativeTime(iso: string | null, now: Date): string {
  if (!iso) return "Belum ada aktivitas";
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

export function AdminOverviewTab() {
  const { loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [onlineUserNames, setOnlineUserNames] = useState<string[]>([]);
  const [recentLocations, setRecentLocations] = useState<{ displayName: string; lastPage: string; lastActivityAt: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const announced = useRef("");
  const now = useNow();

  const handleSnapshot = (snap: AdminStreamSnapshot) => {
    setStats(snap.stats);
    setOnlineUserNames(snap.onlineUserNames);
    setRecentLocations(snap.recentLocations);
    setError(null);
    setLoading(false);
    // Beri tahu screen reader hanya saat yang penting berubah (bukan tiap 15 detik).
    const fingerprint = `${snap.stats?.usersOnline ?? 0}|${snap.stats?.totalReports ?? 0}|${snap.onlineUserNames.length}`;
    if (announced.current !== "" && announced.current !== fingerprint) {
      announceLiveRegion(`Ringkasan admin diperbarui. Online sekarang ${snap.stats?.usersOnline ?? 0} pengguna.`);
    }
    announced.current = fingerprint;
  };

  const { status } = useAdminStream(handleSnapshot, { pollIntervalMs: 30_000 });

  // "Realtime" = SSE aktif; "manual" = fallback polling/jaringan terbatas.
  const mode = status === "live" ? "realtime" : "manual";

  const manualRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const body = await res.json();
      if (body.ok) {
        setStats(body.data as AdminStats);
        setError(null);
      } else {
        setError(body.error?.message ?? "Gagal memuat statistik.");
      }
      announceLiveRegion("Ringkasan dimuat ulang.");
    } catch {
      setError("Gagal memuat ulang ringkasan.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingState label="Memuat ringkasan…" />;
  if (error || !stats) {
    return (
      <div className="rounded-16 border-2 border-danger bg-danger-soft p-6 text-center">
        <p className="text-lg font-bold text-danger">Gagal memuat ringkasan</p>
        <p className="mt-1 text-muted-foreground">{error ?? "Data tidak tersedia."}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          className={
            "inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold " +
            (mode === "realtime"
              ? "border-success-soft bg-success-soft text-success-foreground"
              : "border-warning-soft bg-warning-soft text-warning")
          }
        >
          <span
            aria-hidden="true"
            className={
              "inline-block h-2 w-2 rounded-full " +
              (mode === "realtime" ? "animate-pulse bg-success" : "bg-warning")
            }
          />
          {mode === "realtime" ? "Realtime — data terkini" : "Pembaruan otomatis (jaringan terbatas)"}
        </p>
        <button
          type="button"
          onClick={() => void manualRefresh()}
          className="inline-flex min-h-11 items-center gap-2 rounded-12 border-2 border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Muat ulang
        </button>
      </div>
      {/* Kesehatan & status */}
      <section aria-labelledby="ov-health" className="rounded-20 border-2 border-border bg-card p-5 shadow-card">
        <h3 id="ov-health" className="text-lg font-black">
          Pemantauan pengguna
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCard label="Online sekarang" value={stats.usersOnline} tone="success" hint="Aktivitas ≤ 10 menit" />
          <StatCard label="Aktif 24 jam" value={stats.usersActive24h} tone="success" hint="Terakhir buka aplikasi" />
          <StatCard label="Berbagi lokasi" value={stats.usersLocated} hint="Konsen lokasi aktif + ada koordinat" />
        </div>
        {onlineUserNames.length > 0 ? (
          <p className="mt-3 text-sm" aria-live="polite">
            <span className="font-semibold">Sedang aktif:</span> {onlineUserNames.join(", ")}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada pengguna aktif saat ini.</p>
        )}
      </section>

      {/* Laporan */}
      <section aria-labelledby="ov-reports" className="mt-5 rounded-20 border-2 border-border bg-card p-5 shadow-card">
        <h3 id="ov-reports" className="text-lg font-black">
          Laporan aksesibilitas
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={stats.totalReports} />
          <StatCard label="Menunggu" value={stats.reportsPending} tone="warning" />
          <StatCard label="Aktif" value={stats.reportsActive} tone="success" />
          <StatCard label="Ditolak" value={stats.reportsRejected} tone="danger" />
          <StatCard label="Selesai" value={stats.reportsResolved} tone="success" />
          <StatCard label="Terverifikasi" value={stats.reportsVerified} tone="success" />
          <StatCard label="Usang" value={stats.reportsOutdated} tone="warning" />
          <StatCard label="Verifikasi masuk" value={stats.totalVerifications} />
        </div>
      </section>

      {/* Komunitas & tempat */}
      <section aria-labelledby="ov-community" className="mt-5 rounded-20 border-2 border-border bg-card p-5 shadow-card">
        <h3 id="ov-community" className="text-lg font-black">
          Komunitas
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatCard label="Pengguna terdaftar" value={stats.totalUsers} />
          <StatCard label="Tempat favorit disimpan" value={stats.totalSaved} />
          <StatCard label="Total poin pengguna" value={stats.totalPoints} hint="Gamifikasi" />
          <StatCard label="Tempat dalam katalog" value={stats.totalPlaces} />
          <StatCard label="Fitur peta" value={stats.totalFeatures} />
        </div>
      </section>

      {/* Aktivitas lokasi terbaru */}
      {recentLocations.length > 0 ? (
        <section aria-labelledby="ov-recent" className="mt-5 rounded-20 border-2 border-border bg-card p-5 shadow-card">
          <h3 id="ov-recent" className="text-lg font-black">
            Lokasi terbaru
          </h3>
          <ul className="mt-3 space-y-2" aria-label="Pengguna yang berbagi lokasi terbaru">
            {recentLocations.map((loc) => (
              <li key={loc.displayName} className="flex flex-wrap items-center justify-between gap-2 rounded-12 bg-muted px-3 py-2 text-sm">
                <span className="font-semibold">{loc.displayName}</span>
                <span className="text-muted-foreground">Halaman: {loc.lastPage || "—"} · {relativeTime(loc.lastActivityAt, now)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Koordinat lengkap ada di tab Pemantauan Lokasi.
          </p>
        </section>
      ) : null}
    </div>
  );
}