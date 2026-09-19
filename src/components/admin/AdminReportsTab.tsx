"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminReportCard } from "@/components/admin/AdminReportCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { announceLiveRegion } from "@/lib/announcement";
import { useToast } from "@/components/ui/Toast";
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

export function AdminReportsTab() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const fetchReports = useCallback(async (status: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoadingReports(true);
    setError(null);
    announceLiveRegion("Memuat laporan…");

    try {
      const params = status ? `?status=${status}&limit=200` : "?limit=200";
      const response = await fetch(`/api/admin/reports${params}`, { signal: ac.signal });
      const body = (await response.json()) as ApiResponse;

      if (!response.ok) throw new Error(body.error?.message ?? "Gagal memuat laporan.");
      setReports(body.data?.reports ?? []);
      announceLiveRegion(`Selesai. ${(body.data?.reports ?? []).length} laporan ditemukan.`);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Gagal memuat laporan. Coba lagi.";
      setError(msg);
      announceLiveRegion(msg, { assertive: true });
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchReports(statusFilter), 0);
    return () => window.clearTimeout(id);
  }, [statusFilter, fetchReports]);

  const handleUpdate = useCallback(
    async (id: string, status: ReportStatus, notes: string) => {
      try {
        const response = await fetch("/api/admin/reports", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status, moderationNotes: notes || null }),
        });
        const body = (await response.json()) as ApiResponse;
        if (!response.ok) throw new Error(body.error?.message ?? "Gagal memperbarui laporan.");
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status, moderationNotes: notes || null } : r)));
        toast({ tone: "success", title: "Status diperbarui", message: "Laporan berhasil diperbarui." });
        announceLiveRegion("Status laporan berhasil diperbarui.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal memperbarui laporan.";
        toast({ tone: "danger", title: "Gagal", message: msg });
        announceLiveRegion(msg, { assertive: true });
      }
    },
    [toast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/admin/reports/${id}`, { method: "DELETE" });
        const body = (await response.json()) as ApiResponse;
        if (!response.ok) throw new Error(body.error?.message ?? "Gagal menghapus laporan.");
        setReports((prev) => prev.filter((r) => r.id !== id));
        toast({ tone: "success", title: "Laporan dihapus", message: "Laporan beserta lampirannya telah dihapus." });
        announceLiveRegion("Laporan dihapus.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menghapus laporan.";
        toast({ tone: "danger", title: "Gagal", message: msg });
        announceLiveRegion(msg, { assertive: true });
      }
    },
    [toast],
  );

  if (loadingReports) return <LoadingState label="Memuat laporan…" />;

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <Select
          label="Filter status"
          options={STATUS_FILTER_OPTIONS as unknown as { value: string; label: string }[]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-16 border-2 border-danger bg-danger-soft p-6 text-center">
          <p className="text-lg font-bold text-danger">Gagal memuat laporan</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void fetchReports(statusFilter)}
            className="mt-3 rounded-8 border-2 border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Coba lagi
          </button>
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          title="Tidak ada laporan"
          description={
            statusFilter ? `Tidak ada laporan dengan status "${statusFilter}".` : "Belum ada laporan yang masuk."
          }
        />
      ) : (
        <ul className="space-y-3" aria-label={`Daftar laporan (${reports.length} laporan)`}>
          {reports.map((report) => (
            <li key={report.id}>
              <AdminReportCard report={report} onUpdate={handleUpdate} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}