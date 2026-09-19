"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { MapPin, PencilLine } from "lucide-react";
import { announceLiveRegion } from "@/lib/announcement";
import { REPORT_STATUS_META } from "@/lib/report-status";
import { haversineKm, formatDistance } from "@/lib/geo";
import { ReportSummaryCard } from "@/components/community/ReportSummaryCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AffectedProfile, ReportDetail } from "@/types";

const TABS = [
  { id: "nearby", label: "Terdekat" },
  { id: "recent", label: "Terbaru" },
  { id: "verified", label: "Terverifikasi" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_FILTERS: { value: ReportDetail["status"] | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "ACTIVE", label: "Masih relevan" },
  { value: "PENDING", label: "Menunggu verifikasi" },
  { value: "OUTDATED", label: "Mungkin usang" },
  { value: "RESOLVED", label: "Sudah diperbaiki" },
];

const PROFILE_FILTERS: { value: AffectedProfile | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua profil" },
  { value: "BOTH", label: "Kursi roda & tunanetra" },
  { value: "WHEELCHAIR_MOBILITY", label: "Pengguna kursi roda" },
  { value: "VISUAL_NAVIGATION", label: "Navigasi tunanetra" },
];

interface ReportsResponse {
  ok: boolean;
  data: { reports: ReportDetail[]; source: string };
}

export function CommunityFeed() {
  const [tab, setTab] = useState<TabId>("recent");
  const [statusFilter, setStatusFilter] = useState<ReportDetail["status"] | "ALL">("ALL");
  const [profileFilter, setProfileFilter] = useState<AffectedProfile | "ALL">("ALL");
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const online = useOnlineStatus();

  const load = useCallback(async (announce = false) => {
    try {
      const response = await fetch("/api/reports", { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal memuat laporan.");
      const body = (await response.json()) as ReportsResponse;
      setReports(body.data.reports);
      setError(null);
      if (announce) announceLiveRegion(`${body.data.reports.length} laporan komunitas dimuat.`);
    } catch {
      setError("Tidak dapat memuat laporan komunitas. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (cancelled) return;
      await load(true);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Segarkan senyap tiap 60 detik selama halaman aktif & online -> feed "realtime".
  useAutoRefresh(() => void load(false), 60_000, online);

  const visible = useMemo(() => {
    let list = reports;
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    if (profileFilter !== "ALL") {
      list = list.filter((r) => r.affectedProfiles.length === 0 || r.affectedProfiles.includes(profileFilter));
    }
    switch (tab) {
      case "nearby":
        if (!currentLocation) return list;
        return [...list].sort((a, b) => {
          const da = distanceOf(a, currentLocation);
          const db = distanceOf(b, currentLocation);
          if (da === null && db === null) return 0;
          if (da === null) return 1;
          if (db === null) return -1;
          return da - db;
        });
      case "verified":
        return [...list].sort(
          (a, b) =>
            (b.verificationCount ?? 0) - (a.verificationCount ?? 0) ||
            new Date(b.lastVerifiedAt ?? b.createdAt).getTime() - new Date(a.lastVerifiedAt ?? a.createdAt).getTime(),
        );
      case "recent":
      default:
        return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [reports, tab, statusFilter, profileFilter, currentLocation]);

  const changeTab = useCallback((next: TabId) => {
    setTab(next);
    const label = TABS.find((t) => t.id === next)?.label ?? next;
    announceLiveRegion(next === "nearby" && !currentLocation ? `${label}: atur lokasi untuk melihat jarak.` : `Tab: ${label}.`);
  }, [currentLocation]);

  const locate = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      announceLiveRegion("Lokasi otomatis tidak didukung. Gunakan tab Terbaru untuk melihat laporan.", {
        assertive: true,
      });
      setTab("recent");
      return;
    }
    announceLiveRegion("Mencari lokasi untuk laporan terdekat.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setTab("nearby");
        announceLiveRegion("Lokasi ditemukan. Laporan diurutkan dari yang terdekat.", { assertive: true });
      },
      () => {
        announceLiveRegion("Izin lokasi ditolak. Gunakan tab Terbaru atas Terverifikasi.", { assertive: true });
        setTab("recent");
      },
    );
  }, []);

  if (loading) {
    return <LoadingState label="Memuat laporan komunitas." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal memuat"
        description={error}
        action={
          <Link
            href="/report"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            Buat laporan
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Urutan laporan" className="flex gap-1 rounded-14 bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => changeTab(t.id)}
            className={`flex-1 rounded-12 px-3 py-2 text-sm font-medium ${
              tab === t.id ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ReportDetail["status"] | "ALL")}
            className="rounded-10 border border-input bg-card px-3 py-2 text-sm"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Terdampak</span>
          <select
            value={profileFilter}
            onChange={(event) => setProfileFilter(event.target.value as AffectedProfile | "ALL")}
            className="rounded-10 border border-input bg-card px-3 py-2 text-sm"
          >
            {PROFILE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {tab === "nearby" ? (
          <button
            type="button"
            onClick={locate}
            className="inline-flex items-center gap-1.5 rounded-10 border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Pakai lokasiku
          </button>
        ) : null}
      </div>

      {tab === "nearby" && !currentLocation ? (
        <div aria-live="polite" className="rounded-12 border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
          Pilih “Pakai lokasiku” untuk melihat laporan terdekat. Tanpa lokasi, laporan ditampilkan dari yang terbaru.
        </div>
      ) : null}

      {statusFilter !== "ALL" ? (
        <p className="sr-only" aria-live="polite">
          {REPORT_STATUS_META[statusFilter].label} ditampilkan.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="Belum ada laporan"
          description="Jadilah yang pertama melaporkan hambatan aksesibilitas di sekitarmu."
          action={
            <Link
              href="/report"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" />
              Buat laporan
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {visible.map((report) => (
            <li key={report.id}>
              <ReportSummaryCard
                report={report}
                distanceLabel={distanceLabelOf(report, currentLocation)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function distanceOf(
  report: ReportDetail,
  origin: { lat: number; lng: number },
): number | null {
  if (report.latitude === null || report.longitude === null) return null;
  return haversineKm(origin, { lat: report.latitude, lng: report.longitude });
}

function distanceLabelOf(
  report: ReportDetail,
  origin: { lat: number; lng: number } | null,
): string | undefined {
  if (!origin) return undefined;
  const km = distanceOf(report, origin);
  return km === null ? undefined : formatDistance(km);
}