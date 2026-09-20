"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MapPin, Megaphone, Navigation2 } from "lucide-react";
import { AccessibilityScore } from "@/components/ui/AccessibilityScore";
import { ReportCard } from "@/components/ui/ReportCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { announceLiveRegion } from "@/lib/announcement";
import { AudioPriority } from "@/types";
import type { AccessibilityEvaluation, PlaceDetail } from "@/types";

interface DetailResponse {
  ok: boolean;
  data: { place: PlaceDetail; source: string; unanalyzed?: boolean };
}

interface EvaluationResponse {
  ok: boolean;
  data: { evaluation: AccessibilityEvaluation | null; source: string };
}

export default function PlaceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeProfile } = useAccessibilityProfile();
  const audio = useAudioManager();

  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [unanalyzed, setUnanalyzed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<AccessibilityEvaluation | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/places/${params.id}`, { cache: "no-store" });
        const body = (await response.json()) as DetailResponse;
        if (!cancelled) {
          setDetail(body.data.place);
          setSource(body.data.source);
          setUnanalyzed(body.data.unanalyzed === true);
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

  const loadEvaluation = useCallback(async () => {
    if (!activeProfile || unanalyzed) {
      setEvaluation(null);
      setEvaluationError(null);
      return;
    }
    setEvaluationError(null);
    try {
      const response = await fetch(
        `/api/places/${params.id}/accessibility?profile=${encodeURIComponent(activeProfile)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Gagal memuat skor aksesibilitas.");
      const body = (await response.json()) as EvaluationResponse;
      setEvaluation(body.data.evaluation);
    } catch {
      setEvaluationError("Skor aksesibilitas gagal dimuat.");
    }
  }, [params.id, activeProfile, unanalyzed]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (cancelled) return;
      await loadEvaluation();
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [loadEvaluation]);

  if (loading) return <div className="mx-auto w-full max-w-3xl px-4 py-6"><LoadingState label="Memuat detail tempat." /></div>;

  if (!error && unanalyzed && detail) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke peta
        </Link>
        <section className="mt-4 rounded-20 border-2 border-border bg-card p-5 shadow-card" aria-labelledby="place-heading">
          <h1 id="place-heading" className="text-h1 font-black">
            {detail.summary.name}
          </h1>
          <p className="mt-1 text-muted-foreground">Belum memiliki analisis aksesibilitas.</p>
          <p className="mt-3 text-muted-foreground">{detail.description}</p>
        </section>
        <div className="mt-6 flex flex-wrap gap-3" role="group" aria-label="Aksi untuk tempat yang belum dianalisis">
          <Link
            href="/map"
            className="inline-flex h-13 items-center justify-center gap-2 rounded-14 bg-primary px-6 font-bold text-primary-foreground shadow-card hover:bg-primary-hover"
          >
            <Navigation2 className="h-5 w-5" aria-hidden="true" />
            Lihat di peta
          </Link>
          <Link
            href="/report"
            className="inline-flex h-13 items-center justify-center gap-2 rounded-14 border-2 border-border bg-card px-6 font-bold hover:bg-muted"
          >
            <Megaphone className="h-5 w-5 text-danger" aria-hidden="true" />
            Laporkan hambatan
          </Link>
        </div>
      </div>
    );
  }

  if (error || !detail)
    return (
      <ErrorState
        title="Gagal memuat"
        description={error ?? "Terjadi kesalahan."}
        action={
          <Link
            href="/map"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Kembali ke peta
          </Link>
        }
      />
    );

  const positives = evaluation?.factors.filter((f) => f.kind === "positive") ?? [];
  const negatives = evaluation?.factors.filter((f) => f.kind === "negative") ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link
        href="/map"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline underline-offset-2 hover:text-primary-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke peta
      </Link>

      <section className="mt-4 rounded-20 border-2 border-border bg-card p-5 shadow-card" aria-labelledby="place-heading">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 id="place-heading" className="text-h1 font-black">
              {detail.summary.name}
            </h1>
            <p className="mt-1 text-muted-foreground">{detail.summary.address}, {detail.summary.city}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail.summary.category}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Koordinat: {detail.summary.lat.toFixed(4)}, {detail.summary.lng.toFixed(4)}
            </p>
          </div>
          <Badge tone="neutral" symbol={source === "demo" ? "D" : "🗄"}>
            {source === "demo" ? "Data demo" : "Database"}
          </Badge>
        </div>
        <p className="mt-3 text-muted-foreground">{detail.description}</p>
      </section>

      <section className="mt-6" aria-labelledby="score-heading">
        <h2 id="score-heading" className="text-h3 font-semibold">
          Skor aksesibilitas
        </h2>
        <div className="mt-3">
          {activeProfile && evaluation ? (
            <AccessibilityScore
              score={evaluation.score}
              label={evaluation.label}
              factors={evaluation.factors}
              confidence={evaluation.confidence}
              freshness={evaluation.freshness}
            />
          ) : (
            <div className="rounded-16 border border-border bg-card p-4 shadow-card">
              <p className="text-sm text-muted-foreground">
                <Link href="/onboarding" className="font-medium text-primary underline-offset-2 hover:underline">
                  Pilih profil aksesibilitas
                </Link>{" "}
                untuk melihat skor sesuai kebutuhanmu (visual atau kursi roda).
              </p>
            </div>
          )}
          {evaluationError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {evaluationError}
            </p>
          ) : null}
        </div>
      </section>

      {evaluation && evaluation.score != null ? (
        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-labelledby="conditions-heading">
          <h2 id="conditions-heading" className="sr-only">
            Kondisi utama
          </h2>
          <div className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
            <h3 className="text-h3 font-black">
              <span aria-hidden="true" className="text-success">✓</span> Fasilitas & poin positif
            </h3>
            {positives.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {positives.map((factor) => (
                  <li key={factor.label} className="flex items-baseline gap-2">
                    <span aria-hidden="true" className="w-4 shrink-0 text-center font-bold text-success">
                      ✓
                    </span>
                    <span>{factor.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Belum ada fasilitas positif yang tercatat.</p>
            )}
          </div>
          <div className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
            <h3 className="text-h3 font-black">
              <span aria-hidden="true" className="text-danger">✕</span> Hambatan yang tercatat
            </h3>
            {negatives.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {negatives.map((factor) => (
                  <li key={factor.label} className="flex items-baseline gap-2">
                    <span aria-hidden="true" className="w-4 shrink-0 text-center font-bold text-danger">
                      ✕
                    </span>
                    <span>{factor.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Tidak ada hambatan tercatat untuk kondisi ini.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="entrances-heading">
        <h2 id="entrances-heading" className="text-h3 font-semibold">
          Akses masuk
        </h2>
        <ul className="mt-3 space-y-3">
          {detail.entrances.map((entrance) => (
            <li key={entrance.id} className="rounded-20 border-2 border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-black">{entrance.name}</p>
                {entrance.recommended ? (
                  <Badge tone="success" symbol="✓">
                    Direkomendasikan
                  </Badge>
                ) : null}
              </div>
              <dl className="mt-3 grid gap-1 sm:grid-cols-2">
                <div className="flex justify-between gap-2 border-b border-border pb-1 text-sm">
                  <dt className="text-muted-foreground">Tangga</dt>
                  <dd className="font-medium">{entrance.formattedSteps}</dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-border pb-1 text-sm">
                  <dt className="text-muted-foreground">Lebar pintu</dt>
                  <dd className="font-medium">{entrance.formattedWidth}</dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-border pb-1 text-sm">
                  <dt className="text-muted-foreground">Ramp</dt>
                  <dd className="font-medium">{entrance.hasRamp ? "Ada" : "Tidak ada"}</dd>
                </div>
                <div className="flex justify-between gap-2 border-b border-border pb-1 text-sm">
                  <dt className="text-muted-foreground">Tipe</dt>
                  <dd className="font-medium">{entrance.type === "MAIN" ? "Utama" : entrance.type === "ALTERNATE" ? "Alternatif" : "Layanan"}</dd>
                </div>
              </dl>
              {entrance.notes ? <p className="mt-2 text-sm text-muted-foreground">{entrance.notes}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="text-h3 font-semibold">
          Laporan komunitas terbaru
        </h2>
        {detail.reports.length === 0 ? (
          <p className="rounded-16 border border-border bg-card p-4 text-sm text-muted-foreground">
            Belum ada laporan untuk tempat ini.
          </p>
        ) : (
          detail.reports.map((report) => <ReportCard key={report.id} report={report} />)
        )}
      </section>

      <div className="mt-8 space-y-3" role="group" aria-label="Aksi tempat">
        <button
          type="button"
          onClick={() => router.push(`/route?to=${encodeURIComponent(detail.summary.name)}`)}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-16 border-2 border-primary bg-primary px-5 text-lg font-black text-primary-foreground shadow-card hover:bg-primary-hover"
          aria-label={`Buat rute aksesibel ke ${detail.summary.name}`}
        >
          <Navigation2 className="h-6 w-6" aria-hidden="true" />
          Rute Aksesibel ke Sini
        </button>
        <button type="button" onClick={() => { const text = `${detail.summary.name}. ${evaluation ? `${evaluation.label} skor ${evaluation.score ?? "belum tersedia"}.` : ""} ${detail.description}`; audio.speak(text, AudioPriority.UserRequestedInformation); announceLiveRegion(text, { assertive: true }); }} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-12 border-2 border-border bg-card px-5 font-bold hover:bg-muted" aria-label="Dengarkan deskripsi tempat">
          Dengarkan Deskripsi 🔊
        </button>
        <p className="text-sm text-muted-foreground">
          Informasi aksesibilitas berasal dari data komunitas yang{" "}
          {source === "demo" ? <>contoh/demo dan bukan kondisi nyata.</> : "berubah seiring waktu; pastikan kamu tetap waspada."}
        </p>
      </div>
    </div>
  );
}