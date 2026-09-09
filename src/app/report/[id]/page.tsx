"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { AFFECTED_PROFILES, reportCategoryLabel, severityLabel } from "@/lib/constants";
import { VERIFICATION_LABELS } from "@/lib/verification";
import { REPORT_STATUS_META } from "@/lib/report-status";
import { relativeTime, reportConfidenceNote } from "@/lib/report-reliability";
import { ReportVerification } from "@/components/report/ReportVerification";
import type { ReportDetail } from "@/types";

interface ReportResponse {
  ok: boolean;
  data: { report: ReportDetail; source: string };
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return value;
  }
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/reports/${params.id}`, { cache: "no-store" });
        if (response.status === 404) {
          if (!cancelled) setError("Laporan tidak ditemukan.");
          return;
        }
        if (!response.ok) {
          if (!cancelled) setError("Gagal memuat laporan.");
          return;
        }
        const body = (await response.json()) as ReportResponse;
        if (!cancelled) {
          setReport(body.data.report);
          setSource(body.data.source);
        }
      } catch {
        if (!cancelled) setError("Tidak dapat terhubung ke server. Coba lagi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <LoadingState label="Memuat laporan." />
      </div>
    );
  }

  if (error || !report) {
    return (
      <ErrorState
        title="Gagal memuat"
        description={error ?? "Terjadi kesalahan."}
        action={
          <Link
            href="/community"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-14 bg-primary px-5 font-bold text-primary-foreground hover:bg-primary-hover"
          >
            Lihat laporan komunitas
          </Link>
        }
      />
    );
  }

  const freshnessNote = reportConfidenceNote(report);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline underline-offset-2 hover:text-primary-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke laporan komunitas
      </Link>

      <header className="mt-4 rounded-20 border-2 border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning" symbol="⚠">
            {reportCategoryLabel(report.category)}
          </Badge>
          <Badge tone={REPORT_STATUS_META[report.status].tone} symbol={REPORT_STATUS_META[report.status].symbol}>
            {REPORT_STATUS_META[report.status].label}
          </Badge>
          {source === "demo" ? (
            <Badge tone="neutral" symbol="D">
              Data demo
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 text-h2 font-black">{reportCategoryLabel(report.category)}</h1>
        <p className="mt-2 whitespace-pre-wrap text-foreground">{report.description}</p>
      </header>

      <dl className="mt-6 space-y-4 rounded-20 border-2 border-border bg-card p-5 shadow-card">
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Tingkat keparahan</dt>
          <dd className="font-medium">{severityLabel(report.severity)}</dd>
        </div>
        <div className="flex items-start justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Terdampak</dt>
          <dd className="text-right font-medium">
            {report.affectedProfiles.length > 0
              ? report.affectedProfiles
                  .map((p) => AFFECTED_PROFILES.find((o) => o.value === p)?.label ?? p)
                  .join("; ")
              : "Belum ditentukan"}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Lokasi</dt>
          <dd className="text-right font-medium">
            {report.address ? <span className="flex items-center justify-end gap-1">{report.address}</span> : null}
            {report.latitude !== null && report.longitude !== null ? (
              <span className="mt-1 flex items-center justify-end gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
              </span>
            ) : null}
            {!report.address && report.latitude === null ? <span>—</span> : null}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Pelapor</dt>
          <dd className="font-medium">{report.reporterName ?? "Anonim"}</dd>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Dibuat</dt>
          <dd className="font-medium">
            <time dateTime={report.createdAt}>{formatDate(report.createdAt)}</time>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Verifikasi</dt>
          <dd className="text-right font-medium">
            <VerificationBadge status={report.verification} />
          </dd>
        </div>
        {report.verificationCount > 0 ? (
          <div className="flex items-start justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">Terakhir diverifikasi</dt>
            <dd className="text-right font-medium">
              <time dateTime={report.lastVerifiedAt ?? undefined}>{relativeTime(report.lastVerifiedAt)}</time>
            </dd>
          </div>
        ) : null}
      </dl>

      {report.media.length > 0 ? (
        <section className="mt-6" aria-label="Foto laporan">
          {report.media.map((media) => (
            <figure key={media.id} className="rounded-20 border-2 border-border bg-card p-3 shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview data URL */}
              <img
                src={media.url}
                alt={media.caption ?? "Foto hambatan aksesibilitas."}
                className="max-h-80 w-full rounded-12 object-contain"
              />
              {media.caption ? <figcaption className="mt-2 text-xs text-muted-foreground">{media.caption}</figcaption> : null}
            </figure>
          ))}
        </section>
      ) : null}

      {report.aiSuggested ? (
        <p className="mt-6 rounded-14 border-2 border-warning/40 bg-warning-soft px-4 py-3 text-sm font-medium">
          Saran otomatis bersifat bantuan dan tidak menjamin aksesibilitas atau keselamatan.
        </p>
      ) : null}

      {freshnessNote ? (
        <p className="mt-6 rounded-14 border-2 border-warning/40 bg-warning-soft px-4 py-3 text-sm font-medium" aria-live="polite">
          {freshnessNote}
        </p>
      ) : null}

      <ReportVerification report={report} onVerified={setReport} />

      {report.verifications.length > 0 ? (
        <section aria-label="Riwayat verifikasi" className="mt-6 rounded-20 border-2 border-border bg-card p-5 shadow-card">
          <h2 className="font-black">Riwayat verifikasi</h2>
          <ul className="mt-3 space-y-3">
            {report.verifications.map((verification) => (
              <li key={verification.id} className="border-t-2 border-border/60 pt-3 text-sm">
                <p className="font-bold">
                  {verification.type === "CONFIRMED"
                    ? "✓ Masih akurat"
                    : verification.type === "CHANGED"
                      ? "↻ Kondisi berubah"
                      : "✓ Sudah diperbaiki"}
                </p>
                {verification.comment ? <p className="mt-1 text-muted-foreground">{verification.comment}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {verification.userName ?? "Anonim"} · <time dateTime={verification.at}>{relativeTime(verification.at)}</time>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 text-sm text-muted-foreground">
        Informasi ini adalah laporan komunitas dan bukan jaminan kondisi nyata (per {verificationLabel(report.verification).toLowerCase()}).
      </p>
    </div>
  );
}

function verificationLabel(status: ReportDetail["verification"]): string {
  return VERIFICATION_LABELS[status];
}