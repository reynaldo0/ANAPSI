"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { announceLiveRegion } from "@/lib/announcement";
import { reportCategoryLabel } from "@/lib/constants";
import { REPORT_STATUS_META } from "@/lib/report-status";
import { relativeTime } from "@/lib/report-reliability";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { useAuth } from "@/lib/state/AuthContext";
import type { ReportDetail } from "@/types";

interface ReportsResponse {
  ok: boolean;
  data: { reports: ReportDetail[]; source: string };
}

export function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const online = useOnlineStatus();

  const load = useCallback(async (announce = false) => {
    try {
      const response = await fetch("/api/reports?mine=true", { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal memuat laporan.");
      const body = (await response.json()) as ReportsResponse;
      setReports(body.data.reports);
      setError(null);
      if (announce) announceLiveRegion(`${body.data.reports.length} laporan milikmu dimuat.`);
    } catch {
      setError("Tidak dapat memuat laporan. Coba lagi.");
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

  // Status laporanmu bisa berubah oleh admin/verifikator: segarkan senyap tiap 60 detik.
  useAutoRefresh(() => void load(false), 60_000, online);

  if (!user) {
    return (
      <div className="rounded-16 border border-border bg-card p-4 shadow-card">
        <p className="text-sm text-muted-foreground">
          Masuk untuk melihat riwayat laporan yang kamu kirim beserta statusnya.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 border border-border bg-background px-4 text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            Daftar
          </Link>
        </div>
      </div>
    );
  }

  if (reports === null) {
    return <LoadingState label="Memuat laporan milikmu." />;
  }

  if (error) {
    return (
      <p className="rounded-12 border border-danger/40 bg-danger-soft px-4 py-3 text-sm">{error}</p>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        title="Belum ada laporan"
        description="Laporan yang kamu kirim akan tercantum di sini beserta statusnya."
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
    <ul className="divide-y divide-border rounded-16 border border-border bg-card shadow-card">
      {reports.map((report) => {
        const status = REPORT_STATUS_META[report.status];
        return (
          <li key={report.id}>
            <Link
              href={`/report/${report.id}`}
              className="flex items-start justify-between gap-3 p-4 hover:bg-muted"
            >
              <span>
                <span className="block font-medium">{reportCategoryLabel(report.category)}</span>
                <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{report.description}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {report.placeName ?? "Lokasi umum"} · {relativeTime(report.createdAt)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge tone={status.tone} symbol={status.symbol}>
                  {status.label}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}