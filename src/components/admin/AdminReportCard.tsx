"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ReportDetail, ReportStatus } from "@/types";

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; symbol: string }
> = {
  PENDING: { label: "Menunggu", tone: "neutral", symbol: "⏳" },
  VERIFIED: { label: "Terverifikasi", tone: "success", symbol: "✓" },
  ACTIVE: { label: "Aktif", tone: "success", symbol: "✓" },
  OUTDATED: { label: "Kedaluwarsa", tone: "warning", symbol: "⚠" },
  RESOLVED: { label: "Selesai", tone: "success", symbol: "✓" },
  REJECTED: { label: "Ditolak", tone: "danger", symbol: "✕" },
};

interface AdminReportCardProps {
  report: ReportDetail;
  onUpdate: (id: string, status: ReportStatus, notes: string) => Promise<void>;
}

export function AdminReportCard({ report, onUpdate }: AdminReportCardProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(report.moderationNotes ?? "");
  const [saving, setSaving] = useState(false);

  const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.PENDING;

  const handleAction = async (newStatus: ReportStatus) => {
    setSaving(true);
    try {
      await onUpdate(report.id, newStatus, notes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      className="rounded-16 border border-border bg-card shadow-card"
      aria-label={`Laporan: ${report.categoryLabel}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone} symbol={status.symbol}>
              {status.label}
            </Badge>
            <Badge tone="neutral">{report.categoryLabel}</Badge>
            {report.aiSuggested ? (
              <Badge tone="neutral" symbol="🤖">
                AI
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 font-semibold">{report.categoryLabel}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{report.description}</p>
          {report.address ? (
            <p className="mt-1 text-xs text-muted-foreground">📍 {report.address}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Oleh {report.reporterName ?? "Anonim"} ·{" "}
            {new Date(report.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={`report-detail-${report.id}`}
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-8 border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {open ? "Tutup ▲" : "Kelola ▼"}
        </button>
      </div>

      {/* Expandable moderation panel */}
      {open ? (
        <div
          id={`report-detail-${report.id}`}
          className="border-t border-border p-4 animate-slide-down"
        >
          {/* Media */}
          {report.media.length > 0 ? (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Foto ({report.media.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {report.media.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.caption ?? "Foto hambatan aksesibilitas"}
                    className="h-20 w-20 rounded-8 border border-border object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Verifications */}
          {report.verifications.length > 0 ? (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Verifikasi komunitas ({report.verificationCount})
              </p>
              <ul className="space-y-1.5">
                {report.verifications.slice(0, 3).map((v) => (
                  <li key={v.id} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{v.userName ?? "Anonim"}</span>:{" "}
                    {v.type === "CONFIRMED"
                      ? "✓ Masih akurat"
                      : v.type === "CHANGED"
                        ? "↻ Kondisi berubah"
                        : "✓ Sudah selesai"}
                    {v.comment ? ` — "${v.comment}"` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Moderation notes */}
          <div className="mb-4">
            <label
              htmlFor={`notes-${report.id}`}
              className="mb-1.5 block text-sm font-medium"
            >
              Catatan moderasi
            </label>
            <textarea
              id={`notes-${report.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Tambahkan catatan moderasi (opsional)…"
              className={cn(
                "w-full rounded-12 border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
                "resize-y",
              )}
            />
          </div>

          {/* Action buttons */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Ubah status laporan</legend>
            <div className="flex flex-wrap gap-2" role="group">
              {report.status !== "ACTIVE" && report.status !== "VERIFIED" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={saving}
                  onClick={() => void handleAction("ACTIVE")}
                >
                  ✓ Setujui & Aktifkan
                </Button>
              ) : null}
              {report.status !== "REJECTED" ? (
                <Button
                  size="sm"
                  variant="danger"
                  loading={saving}
                  onClick={() => void handleAction("REJECTED")}
                >
                  ✕ Tolak Laporan
                </Button>
              ) : null}
              {report.status !== "OUTDATED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={saving}
                  onClick={() => void handleAction("OUTDATED")}
                >
                  ⚠ Tandai Kedaluwarsa
                </Button>
              ) : null}
              {report.status !== "RESOLVED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={saving}
                  onClick={() => void handleAction("RESOLVED")}
                >
                  ✓ Tandai Selesai
                </Button>
              ) : null}
              {notes !== (report.moderationNotes ?? "") ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={saving}
                  onClick={() => void handleAction(report.status)}
                >
                  Simpan Catatan
                </Button>
              ) : null}
            </div>
          </fieldset>

          {report.moderationNotes ? (
            <p className="mt-3 rounded-8 bg-warning-soft px-3 py-2 text-sm text-warning">
              <span className="font-semibold">Catatan sebelumnya:</span> {report.moderationNotes}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
