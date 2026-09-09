"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminReportCard } from "@/components/admin/AdminReportCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { announceLiveRegion } from "@/lib/announcement";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/state/AuthContext";
import type { ReportDetail, ReportStatus } from "@/types";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "PENDING", label: "⏳ Menunggu" },
  { value: "ACTIVE", label: "✓ Aktif" },
  { value: "VERIFIED", label: "✓ Terverifikasi" },
  { value: "OUTDATED", label: "⚠ Kedaluwarsa" },
  { value: "RESOLVED", label: "✓ Selesai" },
  { value: "REJECTED", label: "✕ Ditolak" },
] as const;

interface ApiResponse {
  ok: boolean;
  data?: { reports: ReportDetail[]; source: string };
  error?: { message: string };
}

export function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [source, setSource] = useState<string>("demo");
  const abortRef = useRef<AbortController | null>(null);

  const fetchReports = useCallback(
    async (status: string) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoadingReports(true);
      setError(null);
      announceLiveRegion("Memuat laporan…");

      try {
        const params = status ? `?status=${status}` : "";
        const response = await fetch(`/api/admin/reports${params}`, {
          signal: ac.signal,
        });
        const body = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(body.error?.message ?? "Gagal memuat laporan.");
        }
        setReports(body.data?.reports ?? []);
        setSource(body.data?.source ?? "demo");
        announceLiveRegion(
          `Selesai. ${(body.data?.reports ?? []).length} laporan ditemukan.`,
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "Gagal memuat laporan. Coba lagi.";
        setError(msg);
        announceLiveRegion(msg, { assertive: true });
      } finally {
        setLoadingReports(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      const id = window.setTimeout(() => { void fetchReports(statusFilter); }, 0);
      return () => window.clearTimeout(id);
    }
  }, [authLoading, user, statusFilter, fetchReports]);

  const handleUpdate = useCallback(
    async (id: string, status: ReportStatus, notes: string) => {
      try {
        const response = await fetch("/api/admin/reports", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status, moderationNotes: notes || null }),
        });
        const body = (await response.json()) as ApiResponse;
        if (!response.ok) {
          throw new Error(body.error?.message ?? "Gagal memperbarui laporan.");
        }
        // Update local state
        setReports((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status, moderationNotes: notes || null }
              : r,
          ),
        );
        toast({ tone: "success", title: "Status diperbarui", message: `Laporan berhasil diperbarui.` });
        announceLiveRegion("Status laporan berhasil diperbarui.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal memperbarui laporan.";
        toast({ tone: "danger", title: "Gagal", message: msg });
        announceLiveRegion(msg, { assertive: true });
      }
    },
    [toast],
  );

  // Auth check
  if (authLoading) {
    return <LoadingState label="Memeriksa sesi…" />;
  }

  if (!user) {
    return (
      <div className="rounded-16 border border-danger bg-danger-soft p-6 text-center">
        <p className="font-semibold text-danger">Kamu belum masuk.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Masuk dengan akun admin untuk mengakses panel ini.
        </p>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="rounded-16 border border-danger bg-danger-soft p-6 text-center">
        <p className="font-semibold text-danger">✕ Akses ditolak</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman ini hanya tersedia untuk admin BLINDSPOT.
        </p>
      </div>
    );
  }

  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="rounded-12 border border-border bg-card px-4 py-2.5 text-center shadow-soft">
          <p className="text-2xl font-bold">{reports.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-12 border border-warning bg-warning-soft px-4 py-2.5 text-center">
          <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          <p className="text-xs text-warning">Menunggu</p>
        </div>
        <div className="flex items-center rounded-12 border border-border bg-muted px-4 py-2.5 text-xs text-muted-foreground">
          Sumber: <strong className="ml-1">{source}</strong>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 max-w-xs">
        <Select
          label="Filter status"
          options={STATUS_FILTER_OPTIONS as unknown as { value: string; label: string }[]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      {/* Content */}
      {loadingReports ? (
        <LoadingState label="Memuat laporan…" />
      ) : error ? (
        <div className="rounded-16 border border-danger bg-danger-soft p-6 text-center">
          <p className="font-semibold text-danger">Gagal memuat laporan</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void fetchReports(statusFilter)}
            className="mt-3 rounded-8 border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Coba lagi
          </button>
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          title="Tidak ada laporan"
          description={
            statusFilter
              ? `Tidak ada laporan dengan status "${statusFilter}".`
              : "Belum ada laporan yang masuk."
          }
        />
      ) : (
        <ul className="space-y-3" aria-label={`Daftar laporan (${reports.length} laporan)`}>
          {reports.map((report) => (
            <li key={report.id}>
              <AdminReportCard report={report} onUpdate={handleUpdate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
