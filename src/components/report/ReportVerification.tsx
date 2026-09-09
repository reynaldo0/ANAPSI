"use client";

import { useState } from "react";
import { CheckCircle2, ThumbsUp } from "lucide-react";
import { announceLiveRegion } from "@/lib/announcement";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { relativeTime } from "@/lib/report-reliability";
import type { ReportDetail, VerificationType } from "@/types";

interface ReportVerificationProps {
  report: ReportDetail;
  onVerified: (next: ReportDetail) => void;
}

const ACTIONS: { type: VerificationType; label: string; symbol: string }[] = [
  { type: "CONFIRMED", label: "Masih akurat", symbol: "✓" },
  { type: "CHANGED", label: "Kondisi berubah", symbol: "↻" },
  { type: "RESOLVED", label: "Sudah diperbaiki", symbol: "✓" },
];

interface VerifyResponse {
  ok: boolean;
  data?: { report: ReportDetail };
  error?: { code: string; message: string };
}

export function ReportVerification({ report, onVerified }: ReportVerificationProps) {
  const { toast } = useToast();
  const [active, setActive] = useState<VerificationType | null>(null);
  const [comment, setComment] = useState("");
  const [working, setWorking] = useState(false);
  const [thanks, setThanks] = useState(false);

  const locked = report.status === "RESOLVED" || report.status === "REJECTED";

  async function submit(type: VerificationType) {
    setWorking(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/${type === "CONFIRMED" ? "verify" : type.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      });
      const body = (await response.json()) as VerifyResponse;
      if (!response.ok || !body.data) {
        const message = body.error?.message ?? "Gagal mengirim verifikasi.";
        announceLiveRegion(message, { assertive: true });
        toast({ tone: "danger", title: "Gagal mengirim", message });
        return;
      }
      onVerified(body.data.report);
      setComment("");
      setActive(null);
      setThanks(true);
      toast({ tone: "success", title: "Verifikasi terkirim", message: "Lokasi berhasil diperbarui." });
    } catch {
      announceLiveRegion("Tidak dapat terhubung ke server. Coba lagi.", { assertive: true });
      toast({ tone: "danger", title: "Gagal mengirim", message: "Tidak dapat terhubung ke server. Coba lagi." });
    } finally {
      setWorking(false);
    }
  }

  return (
    <section aria-label="Verifikasi laporan" className="mt-6 rounded-16 border border-border bg-card p-4 shadow-card">
      <h2 className="font-semibold">Verifikasi laporan</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bantulah menjaga informasi ini tetap terbarui untuk pengguna lain.
      </p>

      {report.verificationCount > 0 ? (
        <p className="mt-2 text-sm">
          {report.verificationCount} konfirmasi · terakhir{" "}
          <time dateTime={report.lastVerifiedAt ?? undefined}>{relativeTime(report.lastVerifiedAt)}</time>.
        </p>
      ) : null}

      {locked ? (
        <p className="mt-3 rounded-10 bg-muted px-3 py-2 text-sm">
          Laporan ini sudah ditandai{" "}
          {report.status === "RESOLVED" ? "sudah diperbaiki" : "ditolak"}. Tidak perlu verifikasi ulang.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <Button
                key={action.type}
                variant="outline"
                size="sm"
                loading={working && active === action.type}
                disabled={working}
                onClick={() => {
                  setActive(action.type);
                  setComment("");
                }}
              >
                <span aria-hidden="true">{action.symbol}</span>
                {action.label}
              </Button>
            ))}
          </div>

          {active ? (
            <div className="mt-4 space-y-3">
              {active === "CHANGED" ? (
                <label className="block text-sm">
                  <span className="sr-only">Perubahan yang kamu lihat</span>
                  <TextArea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Jelaskan perubahan yang kamu lihat (opsional)."
                    maxLength={500}
                    rows={2}
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={working} onClick={() => void submit(active)} variant="secondary">
                  <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                  Kirim verifikasi
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setActive(null)} disabled={working}>
                  Batal
                </Button>
              </div>
            </div>
          ) : null}

          {thanks ? (
            <p
              className="mt-4 rounded-10 border border-success/40 bg-success-soft px-3 py-2 text-sm"
              aria-live="polite"
            >
              <CheckCircle2 className="me-1 inline h-4 w-4" aria-hidden="true" />
              Terima kasih telah membantu menjaga informasi ini tetap terbarui.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}