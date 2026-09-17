"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, CheckCircle2, ChevronLeft, ClipboardType, Mic, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { TourTrigger } from "@/components/tutorial/TourTrigger";
import { useAuth } from "@/lib/state/AuthContext";
import { useGamification } from "@/lib/state/GamificationContext";
import { useSignLanguage } from "@/lib/state/SignLanguageContext";
import { SignLanguagePanel } from "@/components/sign-language/SignLanguagePanel";
import { badgeById } from "@/lib/gamification-defs";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { structureReportTranscript } from "@/lib/voice/report-structurer";
import { announceLiveRegion } from "@/lib/announcement";
import { cn } from "@/lib/cn";
import {
  AFFECTED_PROFILES,
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  REPORT_CATEGORIES,
  SEVERITY_OPTIONS,
  reportCategoryLabel,
  severityLabel,
} from "@/lib/constants";
import type {
  AffectedProfile,
  GamificationStats,
  ReportCategory,
  ReportDetail,
  Severity,
  SubmitReportInput,
} from "@/types";

type Method = "write" | "voice" | "photo";
type Step = "method" | "form" | "review" | "success";

interface FormState {
  category: ReportCategory | "";
  description: string;
  severity: Severity;
  affectedProfiles: AffectedProfile[];
  address: string;
  latitude: number | null;
  longitude: number | null;
  photo: { url: string; caption: string | null } | null;
  aiSuggested: boolean;
}

const INITIAL_FORM: FormState = {
  category: "",
  description: "",
  severity: "MEDIUM",
  affectedProfiles: [],
  address: "",
  latitude: null,
  longitude: null,
  photo: null,
  aiSuggested: false,
};

const METHOD_META: Record<Method, { icon: typeof Mic; title: string; note: string }> = {
  voice: { icon: Mic, title: "Bicara", note: "Diktekan dan struktur otomatis, tetap dapat diedit." },
  photo: { icon: Camera, title: "Foto", note: "Unggah foto hambatan, lalu isi keterangan." },
  write: { icon: ClipboardType, title: "Ketik", note: "Isi formulir laporan secara manual." },
};

function profileLabel(value: AffectedProfile): string {
  return AFFECTED_PROFILES.find((p) => p.value === value)?.label ?? value;
}

export function ReportFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const gamification = useGamification();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method>("write");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<ReportDetail | null>(null);
  const [earned, setEarned] = useState<{ points: number; badges: string[] } | null>(null);

  const speech = useSpeechRecognition();
  const sign = useSignLanguage();

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function chooseMethod(next: Method) {
    try { if ("vibrate" in navigator) navigator.vibrate(40); } catch {}
    setFormError(null);
    setMethod(next);
    setStep("form");
    announceLiveRegion(`Metode ${next} dipilih.`, { assertive: true });
  }

  function toggleProfile(value: AffectedProfile) {
    setForm((f) => ({
      ...f,
      affectedProfiles: f.affectedProfiles.includes(value)
        ? f.affectedProfiles.filter((p) => p !== value)
        : [...f.affectedProfiles, value],
    }));
  }

  function useCurrentLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("Peramban tidak mendukung lokasi. Isi alamat secara manual.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((f) => ({
          ...f,
          latitude,
          longitude,
          address: "Lokasi saat ini (koordinat dari perangkat)",
        }));
      },
      () => {
        setLocationError("Gagal mendapatkan lokasi. Isi alamat manual atau lanjut tanpa koordinat.");
      },
      { timeout: 10000 },
    );
  }

  function selectPhoto(file: File) {
    setPhotoError(null);
    if (!ALLOWED_PHOTO_TYPES.some((t) => t === file.type)) {
      setPhotoError("Jenis file tidak didukung. Gunakan PNG, JPG, atau WebP.");
      announceLiveRegion("Jenis file tidak didukung. Gunakan PNG, JPG, atau WebP.", { assertive: true });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("File terlalu besar. Maksimal 5 MB.");
      announceLiveRegion("File terlalu besar. Maksimal 5 MB.", { assertive: true });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      setForm((f) => ({ ...f, photo: { url, caption: "Foto hambatan aksesibilitas." } }));
      announceLiveRegion("Foto hambatan dipilih.");
    };
    reader.onerror = () => {
      setPhotoError("Gagal membaca foto. Coba file lain.");
      announceLiveRegion("Gagal membaca foto.", { assertive: true });
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setForm((f) => ({ ...f, photo: null }));
    announceLiveRegion("Foto hambatan dihapus.");
  }

  function finishVoice() {
    setFormError(null);
    announceLiveRegion("Transkripsi selesai.");
    const transcript = speech.finalTranscript.trim() || speech.interim.trim();
    if (!transcript) {
      setFormError("Tidak ada transkripsi. Bicaralah, lalu coba lagi, atau tulis laporan.");
      return;
    }
    const structured = structureReportTranscript(transcript);
    setForm((f) => ({
      ...f,
      category: structured.category,
      description: structured.description,
      severity: structured.severity,
      affectedProfiles: structured.affectedProfiles,
      address: structured.suggestedLocation ?? f.address,
    }));
  }

  function validateForm(): string | null {
    if (!form.category) return "Pilih kategori laporan.";
    if (form.description.trim().length < 10) return "Deskripsi minimal 10 karakter.";
    if (form.affectedProfiles.length === 0) return "Pilih siapa yang terdampak.";
    const hasLocation = form.address.trim().length > 0 || (form.latitude !== null && form.longitude !== null);
    if (!hasLocation) return "Isi lokasi (alamat) atau gunakan lokasi saat ini.";
    return null;
  }

  function goReview() {
    const error = validateForm();
    setFormError(error);
    if (error) {
      announceLiveRegion(error, { assertive: true });
      return;
    }
    setSubmitError(null);
    setStep("review");
  }

  async function submitReport() {
    setSubmitting(true);
    setSubmitError(null);
    const payload: SubmitReportInput = {
      category: form.category as ReportCategory,
      description: form.description.trim(),
      severity: form.severity,
      affectedProfiles: form.affectedProfiles,
      address: form.address.trim() || null,
      latitude: form.latitude,
      longitude: form.longitude,
      media: form.photo ? [{ kind: "photo", url: form.photo.url, caption: form.photo.caption }] : [],
      aiSuggested: form.aiSuggested,
      reporterId: gamification.reporterId || undefined,
      reporterName: user?.displayName ?? null,
    };
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        ok: boolean;
        data?: { report: ReportDetail; gamification?: GamificationStats };
        error?: { message: string };
      };
      if (!response.ok || !body.ok || !body.data) {
        throw new Error(body.error?.message ?? "Gagal mengirim laporan.");
      }
      setCreated(body.data.report);
      if (body.data.gamification) {
        const next = gamification.applyServerResult(body.data.gamification);
        setEarned({ points: next.points, badges: next.lastEarned });
      }
      setStep("success");
      announceLiveRegion("Laporan berhasil dikirim.", { assertive: true });
      toast({ tone: "success", message: "Laporan berhasil dikirim." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengirim laporan.";
      setSubmitError(message);
      announceLiveRegion(`Gagal mengirim laporan. ${message}`, { assertive: true });
      toast({ tone: "danger", message });
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setForm(INITIAL_FORM);
    setCreated(null);
    setEarned(null);
    setSubmitError(null);
    setFormError(null);
    setPhotoError(null);
    setLocationError(null);
    setMethod("write");
    setStep("method");
  }

  if (step === "success" && created) {
    return (
      <div
        className="mx-auto w-full max-w-2xl px-4 py-8"
        role="status"
        aria-live="polite"
      >
        <div className="rounded-24 border-2 border-success bg-success-soft p-6 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
          <h1 className="mt-3 text-h2 font-bold" tabIndex={-1} ref={headingRef}>
            Laporan berhasil dikirim
          </h1>
          <p className="mt-2 text-muted-foreground">
            Terima kasih telah membantu menjaga informasi aksesibilitas tetap terbarui.
          </p>

          {earned && earned.points > 0 ? (
            <div
              className="mt-5 rounded-20 border-2 border-primary/40 bg-card p-4 text-left shadow-card"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-muted-foreground">Poin kamu</p>
                <p className="text-h3 font-black text-primary">+{earned.points} poin</p>
              </div>
              {earned.badges.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {earned.badges.map((badgeId) => {
                    const def = badgeById(badgeId as Parameters<typeof badgeById>[0]);
                    return (
                      <li
                        key={badgeId}
                        className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-primary-soft px-3 py-1.5 text-sm font-bold"
                      >
                        <span aria-hidden="true">{def.icon}</span> Lencana baru: {def.name}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Lapor kondisi berbahaya atau dengan foto = poin lebih banyak.
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/report/${created.id}`}
              className="inline-flex h-12 items-center justify-center rounded-16 primary-solid px-6 font-black text-primary-foreground shadow-card hover:primary-solid hover:opacity-90"
            >
              Lihat laporan
            </Link>
            <Button variant="outline" onClick={resetFlow}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Laporkan yang lain
            </Button>
          </div>
        </div>
        {sign.enabled ? (
          <SignLanguagePanel
            title="Status laporan"
            text="Laporan berhasil dikirim. Terima kasih telah membantu menjaga informasi aksesibilitas tetap terbarui."
            className="mt-4"
          />
        ) : null}
        {created.source === "user" ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Catatan pengembangan: laporan baru tersimpan di memori server demo dan akan hilang saat server dimatikan.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-h1 font-bold" tabIndex={-1} ref={headingRef}>
        {step === "method" ? "Lapor Hambatan Aksesibilitas" : step === "review" ? "Tinjau laporan" : "Detail laporan"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Ramah & cepat — kamu cuma perlu 3 langkah.
      </p>
      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Tahapan melapor">
        {[
          ["method", "1", "Pilih cara", "Ketik, bicara, atau foto"],
          ["form", "2", "Isi detail", "Apa, siapa yang terdampak, di mana"],
          ["review", "3", "Kirim", "Tinjau sebentar, lalu laporkan"],
        ].map(([value, number, label, note]) => {
          const done =
            (step === "form" && (value === "method" || value === "form")) ||
            (step === "review" && value !== "review");
          const active = step === value;
          return (
            <li
              key={value}
              className={cn(
                "rounded-14 border-2 p-3",
                active ? "border-primary bg-primary-soft" : done ? "border-success/40" : "border-border bg-card",
              )}
              aria-current={active ? "step" : undefined}
            >
              <p className={cn("flex items-center gap-1.5 text-sm font-black", active ? "text-primary" : done ? "text-success" : "text-muted-foreground")}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-xs">
                  {done ? "✓" : number}
                </span>
                {label}
              </p>
              <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{note}</p>
            </li>
          );
        })}
      </ol>
      {user ? (
        <p className="mt-1 text-sm text-muted-foreground">Melapor sebagai {user.displayName}.</p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Belum masuk — laporan akan tercatat sebagai anonim dan tetap masuk ke sistem.
        </p>
      )}
      <p className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border-2 border-primary/40 bg-primary-soft px-4 py-2 text-sm font-bold">
        <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Setiap laporan fasilitas rusak memberi poin & lencana — tanpa perlu masuk.
      </p>
      <div className="mt-4">
        <TourTrigger feature="report" />
      </div>

      {step === "method" ? (
        <div className="mt-6 space-y-3" role="group" aria-label="Pilih cara melapor" data-tour="report-method">
          {(Object.keys(METHOD_META) as Method[]).map((key) => {
            const meta = METHOD_META[key];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => chooseMethod(key)}
                className="flex w-full items-center gap-4 rounded-20 border-2 border-border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary focus-visible:outline-offset-2"
              >
                <span aria-hidden="true" className="flex h-13 w-13 shrink-0 items-center justify-center rounded-14 bg-primary-soft text-2xl">
                  <Icon className="h-6 w-6 text-primary" />
                </span>
                <span>
                  <span className="block text-lg font-black">{meta.title}</span>
                  <span className="block text-sm text-muted-foreground">{meta.note}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : step === "form" ? (
        <form
          className="mt-6 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            goReview();
          }}
          aria-label="Formulir laporan"
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("method")}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Ubah cara melapor
            </Button>
          </div>

          {method === "voice" ? (
            <VoiceEditor
              speech={speech}
              onStop={finishVoice}
              onFallback={() => {
                if (speech.finalTranscript) {
                  const s = structureReportTranscript(speech.finalTranscript);
                  setForm((f) => ({
                    ...f,
                    category: s.category,
                    description: s.description,
                    severity: s.severity,
                    affectedProfiles: s.affectedProfiles,
                  }));
                }
                setMethod("write");
              }}
            />
          ) : null}

          {method === "photo" ? (
            <PhotoEditor
              photo={form.photo}
              error={photoError}
              onSelect={selectPhoto}
              onRemove={removePhoto}
            />
          ) : null}

          <fieldset data-tour="report-category">
            <legend className="mb-2 text-sm font-medium">Apa yang terjadi? *</legend>
            <Select
              label="Kategori"
              required
              value={form.category}
              onChange={(event) => setForm((f) => ({ ...f, category: event.target.value as ReportCategory }))}
              options={REPORT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
            <div className="mt-3">
              <TextArea
                label="Deskripsi"
                required
                rows={4}
                placeholder="Contoh: ramp di pintu masuk retak dan susah dilewati kursi roda."
                value={form.description}
                onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Siapa yang terdampak? *</legend>
            <div className="mt-2 space-y-2">
              {AFFECTED_PROFILES.map((profile) => {
                const checked = form.affectedProfiles.includes(profile.value);
                return (
                  <label
                    key={profile.value}
                    className="flex items-center gap-3 rounded-12 border border-border bg-card px-4 py-3 has-[:checked]:border-primary"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProfile(profile.value)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium">{profile.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Tingkat keparahan (opsional)</legend>
            <Select
              className="mt-2"
              value={form.severity}
              onChange={(event) => setForm((f) => ({ ...f, severity: event.target.value as Severity }))}
              options={SEVERITY_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            />
          </fieldset>

          <fieldset data-tour="report-location">
            <legend className="text-sm font-medium">Di mana lokasinya? *</legend>
            <div className="mt-2">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  label="Alamat atau deskripsi lokasi"
                  required
                  placeholder="Contoh: Pintu masuk utama, Jalan Pemuda No. 58"
                  value={form.address}
                  onChange={(event) => setForm((f) => ({ ...f, address: event.target.value }))}
                />
                <Button
                  variant="outline"
                  type="button"
                  onClick={useCurrentLocation}
                  className="shrink-0"
                >
                  Gunakan lokasi saat ini
                </Button>
              </div>
              {locationError ? (
                <p role="alert" className="mt-2 text-xs font-medium text-danger">
                  {locationError}
                </p>
              ) : null}
              {form.latitude !== null && form.longitude !== null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Koordinat: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                </p>
              ) : null}
            </div>
          </fieldset>

          {formError ? (
            <p role="alert" className="rounded-12 border border-danger/40 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="lg" className="sm:flex-1" data-tour="report-submit">
              Lanjut ke tinjauan
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <dl className="divide-y divide-border rounded-20 border-2 border-border bg-card shadow-card">
            <SummaryRow label="Kategori" value={form.category ? reportCategoryLabel(form.category) : ""} />
            <SummaryRow label="Dampak" value={form.affectedProfiles.map(profileLabel).join("; ")} />
            <SummaryRow label="Keparahan" value={severityLabel(form.severity)} />
            <SummaryRow
              label="Lokasi"
              value={
                form.address ||
                (form.latitude !== null ? `${form.latitude.toFixed(5)}, ${form.longitude?.toFixed(5)}` : "Tidak diisi")
              }
            />
            <div className="px-4 py-3">
              <dt className="text-sm font-semibold">Deskripsi</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{form.description}</dd>
            </div>
          </dl>

          {form.photo ? (
            <figure className="rounded-16 border border-border bg-card p-3 shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview data URL */}
              <img
                src={form.photo.url}
                alt={form.photo.caption ?? "Foto hambatan aksesibilitas."}
                className="max-h-64 w-full rounded-12 object-contain"
              />
              <figcaption className="mt-2 text-xs text-muted-foreground">
                {form.photo.caption ?? "Foto hambatan aksesibilitas."}
              </figcaption>
            </figure>
          ) : null}

          {form.aiSuggested ? (
            <p className="rounded-12 border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
              Saran AI disertakan — ini bantuan, mohon periksa kembali sebelum mengirim.
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Laporan akan tampil untuk komunitas sebagai informasi aksesibilitas.
          </p>

          {submitError ? (
            <div role="alert" className="rounded-12 border border-danger/40 bg-danger-soft p-4">
              <p className="font-medium text-danger">{submitError}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="danger" onClick={() => void submitReport()}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Coba lagi
                </Button>
                {method !== "write" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMethod("write");
                      setStep("form");
                    }}
                  >
                    Alihkan ke ketik
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setSubmitError(null);
                  setStep("form");
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Kembali
              </Button>
              <Button size="lg" className="sm:flex-1" loading={submitting} onClick={() => void submitReport()}>
                {submitting ? "Mengirim laporan..." : "Kirim laporan"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="mt-0.5 text-sm text-muted-foreground">{value || "—"}</dd>
    </div>
  );
}

function VoiceEditor({
  speech,
  onStop,
  onFallback,
}: {
  speech: ReturnType<typeof useSpeechRecognition>;
  onStop: () => void;
  onFallback: () => void;
}) {
  const listening = speech.status === "listening";
  const statusLabel =
    speech.status === "listening"
      ? "Mendengarkan. Bicarakan hambatan yang kamu temui."
      : speech.status === "processing"
        ? "Sedang memproses transkripsi."
        : speech.finalTranscript
          ? "Transkripsi selesai."
          : "Mikrofon tidak aktif.";

  return (
    <div className="rounded-20 border-2 border-border bg-card p-5 shadow-card">
      <h2 className="text-h3 font-black">Ceritakan apa yang terjadi</h2>
      <div className="mt-4 flex flex-col items-center gap-3">
        <div aria-live="polite">
          <span className="sr-only">{statusLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => (listening ? speech.stop() : speech.start())}
          aria-label={listening ? "Hentikan perekaman suara" : "Mulai merekam suara"}
          className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl transition-colors focus-visible:outline-offset-2 ${
            listening ? "bg-danger text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          {listening ? <span className="animate-pulse text-3xl">●</span> : <Mic className="h-9 w-9" aria-hidden="true" />}
        </button>
        <p className="text-sm font-medium">
          Mikrofon: <span>{listening ? "Listening" : "Inactive"}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {listening ? "Ketuk untuk berhenti" : "Tekan tombol, lalu bicarakan hambatannya"}
        </p>
      </div>

      {speech.interim ? (
        <p className="mt-4 rounded-12 bg-muted px-4 py-3 text-sm italic" aria-live="polite">
          {speech.interim}
        </p>
      ) : null}
      {speech.status === "inactive" && speech.finalTranscript ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Kami memahami:</p>
          <p className="mt-1 rounded-12 bg-muted px-4 py-3 text-sm">“{speech.finalTranscript}”</p>
          <Button type="button" className="mt-3" onClick={onStop}>
            Terapkan ke laporan
          </Button>
        </div>
      ) : null}

      {!speech.supported ? (
        <p className="mt-4 rounded-12 border border-warning/40 bg-warning-soft px-4 py-3 text-sm" role="alert">
          Peramban ini tidak mendukung dikte suara. Ketik laporan sebagai gantinya.
        </p>
      ) : null}

      <div className="mt-4">
        <Button type="button" variant="outline" onClick={onFallback}>
          Tulis laporan saja (tanpa suara)
        </Button>
      </div>
    </div>
  );
}

function PhotoEditor({
  photo,
  error,
  onSelect,
  onRemove,
}: {
  photo: FormState["photo"];
  error: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-20 border-2 border-dashed border-border bg-card p-5">
      <h2 className="text-h3 font-black">Foto hambatan</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        PNG, JPG, atau WebP. Maksimal 5 MB. Gagal unggah akan ditampilkan di sini.
      </p>
      {!photo ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-12 border border-border bg-background px-4 py-8 text-center transition-colors hover:border-primary"
        >
          <Camera className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">Pilih atau unggah foto</span>
          <span className="text-xs text-muted-foreground">Foto dapat dihapus setelah dipilih.</span>
        </button>
      ) : (
        <figure className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview data URL */}
          <img
            src={photo.url}
            alt={photo.caption ?? "Foto hambatan aksesibilitas."}
            className="max-h-72 w-full rounded-12 object-contain"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <figcaption className="text-xs text-muted-foreground">
              {photo.caption ?? "Foto hambatan aksesibilitas."}
            </figcaption>
            <Button type="button" variant="danger" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Hapus foto
            </Button>
          </div>
        </figure>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
      />
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <p className="mt-3 rounded-12 border border-border bg-muted/60 px-4 py-3 text-sm">
        Analisis otomatis foto belum tersedia saat ini. Pilih kategori secara manual di bawah — apakah terlihat
        tangga, ramp, guiding block, trotoar rusak, atau hambatan?
      </p>
    </div>
  );
}