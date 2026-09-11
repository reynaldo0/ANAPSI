"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Megaphone,
  Mic,
  MapPin,
  Navigation2,
  Rabbit,
  Star,
  Volume2,
  X,
} from "lucide-react";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { announceLiveRegion } from "@/lib/announcement";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useSpeechRecognition, type VoiceCopy } from "@/lib/voice/useSpeechRecognition";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { AudioPriority, type RouteOption } from "@/types";
import { JourneyMap } from "@/components/journey/JourneyMap";
import { cn } from "@/lib/cn";

const VOICE_COPY: VoiceCopy = {
  listening: "Mikrofon aktif. Katakan: ulangi instruksi, ada hambatan apa, atau berapa jauh lagi.",
  ended: "Perintah selesai.",
  denied: "Akses mikrofon ditolak. Kamu tetap bisa memakai tombol di layar.",
  noSpeech: "Tidak ada suara terdeteksi. Coba lagi.",
  interim: (interimText) => `Mendengarkan. ${interimText}`,
};

interface RoutesResponse {
  ok: boolean;
  data: { routes: RouteOption[]; real?: boolean };
  error?: { code: string; message: string };
}

function scoreTone(score: number | null): BadgeTone {
  if (score === null) return "neutral";
  if (score >= 80) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

export function JourneyController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProfile } = useAccessibilityProfile();
  const audio = useAudioManager();
  const voice = useSpeechRecognition(VOICE_COPY);

  const routeParam = searchParams.get("route");
  const destinationParam = searchParams.get("destination");
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");

  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [realStreet, setRealStreet] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(routeParam);
  const [screen, setScreen] = useState<"brief" | "nav">("brief");
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handledLengthRef = useRef(0);
  const stepIndexRef = useRef(0);

  const selected = useMemo(
    () => routes?.find((r) => r.id === selectedId) ?? routes?.[0] ?? null,
    [routes, selectedId],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!activeProfile || !destinationParam || latParam === null || lngParam === null) {
        if (!cancelled) {
          setLoading(false);
          setError("Rute belum dapat dibuat untuk lokasi ini. Silakan coba lokasi lain.");
        }
        return;
      }
      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { lat: Number(latParam), lng: Number(lngParam) },
            originName: searchParams.get("from") ?? "Lokasiku",
            destinationId: destinationParam,
            profile: activeProfile,
          }),
        });
        const body = (await response.json()) as RoutesResponse;
        if (!response.ok || !body.data || body.data.routes.length === 0) {
          if (!cancelled) {
            setError(body.error?.message ?? "Rute belum dapat dibuat untuk lokasi ini. Silakan coba lokasi lain.");
          }
          return;
        }
        if (!cancelled) {
          setRoutes(body.data.routes);
          setRealStreet(body.data.real === true);
          const wanted = body.data.routes.find((r) => r.id === routeParam);
          setSelectedId(wanted?.id ?? body.data.routes[0].id);
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
  }, [activeProfile, destinationParam, latParam, lngParam, routeParam, searchParams]);

  const haptic = (pattern: number | number[]) => {
    try {
      if ("vibrate" in navigator) navigator.vibrate(pattern);
    } catch {}
  };
  const speak = (text: string) => {
    audio.speak(text, AudioPriority.NavigationInstruction);
  };

  const briefText = useMemo(() => {
    if (!selected) return "";
    const barriers = selected.barriers.length;
    const lines = [
      `Perjalanan menuju ${selected.toName}.`,
      `Jarak ${selected.distanceLabel.replace("≈ ", "")} sekitar, estimasi ${selected.durationLabel}.`,
      selected.accessibilityScore !== null ? `Skor aksesibilitas ${selected.accessibilityScore} dari 100.` : "Belum tersedia cukup data aksesibilitas untuk perhitungan skor.",
      barriers > 0 ? `${barriers} hambatan diketahui di sepanjang rute.` : "Tidak ada hambatan yang dilaporkan di rute ini.",
    ];
    for (const warning of selected.barriers.slice(0, 3)) {
      lines.push(`${warning.label} dilaporkan sekitar ${warning.distanceMeters} meter dari awal.`);
    }
    for (const facility of selected.facilities.slice(0, 2)) {
      lines.push(facility.label.replace(/: /g, ": "));
    }
    return lines.join(" ");
  }, [selected]);

  const speakBrief = () => {
    audio.speak(briefText, AudioPriority.UserRequestedInformation);
  };

  const startNavigation = () => {
    setScreen("nav");
    setStepIndex(0);
    haptic([200, 100, 200]);
    try {
      if ("wakeLock" in navigator) {
        (navigator as unknown as { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request("screen").catch(() => {});
      }
    } catch {}
    if (!selected) return;
    const first = selected.steps[0];
    const text = [first.instruction, first.barrierLabel, first.facilityLabel].filter(Boolean).slice(0, 2).join(". ");
    announceLiveRegion(`Navigasi dimulai. ${first.instruction}`);
    audio.speak(text || first.instruction, AudioPriority.NavigationInstruction);
  };

  const currentStep = selected?.steps[stepIndex] ?? null;
  const isArrival = currentStep?.isArrival ?? false;

  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  const handleAutoStep = (i: number) => {
    if (!selected) return;
    const max = selected.steps.length - 1;
    const next = Math.max(0, Math.min(i, max));
    if (next <= stepIndexRef.current) return;
    stepIndexRef.current = next;
    setStepIndex(next);
    const step = selected.steps[next];
    const isArrive = step.isArrival ?? false;
    haptic(isArrive ? [100, 50, 100, 50, 300] : 40);
    const text = [step.instruction, step.barrierLabel, step.facilityLabel].filter(Boolean).slice(0, 2).join(". ");
    announceLiveRegion(step.instruction);
    audio.speak(text || step.instruction, isArrive ? AudioPriority.GeneralUiFeedback : AudioPriority.NavigationInstruction);
    if (step.barrierLabel) haptic([120, 60, 120]);
  };

  const switchRoute = (id: string) => {
    setSelectedId(id);
    setStepIndex(0);
    setScreen(routes ? "brief" : "brief");
    if (screen === "nav") setScreen("brief");
    announceLiveRegion("Alternatif rute dipilih. Tinjau kembali ringkasan perjalanan.");
  };

  const remainingMeters = useMemo(() => {
    if (!selected || stepIndex >= selected.steps.length - 1) return 0;
    return selected.steps.slice(stepIndex, -1).reduce((acc, s) => acc + s.distanceMeters, 0);
  }, [selected, stepIndex]);

  const progress = useMemo(() => {
    if (!selected) return 0;
    const total = selected.steps.reduce((acc, s) => acc + s.distanceMeters, 0);
    const done = selected.steps.slice(0, stepIndex).reduce((acc, s) => acc + s.distanceMeters, 0);
    return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  }, [selected, stepIndex]);

  const repeatInstruction = () => {
    if (!currentStep) return;
    haptic(80);
    speak([currentStep.instruction, currentStep.barrierLabel, currentStep.facilityLabel].filter(Boolean).join(". ") || currentStep.instruction);
  };

  const nextStep = () => {
    if (!selected) return;
    if (stepIndex >= selected.steps.length - 1) {
      haptic([100, 50, 100, 50, 300]);
      speak("Kamu sudah tiba di tujuan.");
      return;
    }
    haptic(40);
    const next = stepIndex + 1;
    setStepIndex(next);
    const step = selected.steps[next];
    const text = [step.instruction, step.barrierLabel, step.facilityLabel].filter(Boolean).slice(0, 2).join(". ");
    announceLiveRegion(step.instruction);
    audio.speak(text || step.instruction, AudioPriority.NavigationInstruction);
    if (step.barrierLabel) haptic([120, 60, 120]);
  };

  const prevStep = () => {
    if (stepIndex <= 0) return;
    setStepIndex(stepIndex - 1);
  };

  const speakNextWarning = () => {
    if (!selected) return;
    const upcoming = selected.steps.slice(stepIndex).find((s) => s.barrierLabel);
    if (upcoming) {
      audio.speak(`Hambatan berikutnya: ${upcoming.barrierLabel}`, AudioPriority.UserRequestedInformation);
    } else {
      audio.speak("Tidak ada hambatan yang dilaporkan di sisa rute.", AudioPriority.UserRequestedInformation);
    }
  };

  const speakRemaining = () => {
    audio.speak(`Sisa perjalanan sekitar ${remainingMeters} meter. ${selected?.durationLabel ?? ""}`, AudioPriority.UserRequestedInformation);
  };

  useEffect(() => {
    if (!voice.finalTranscript) return;
    const transcript = voice.finalTranscript;
    const fresh = transcript.slice(handledLengthRef.current);
    handledLengthRef.current = transcript.length;
    const q = fresh.toLowerCase().trim();
    if (!q) return;
    if (q.includes("ulang") || q.includes("repeat")) {
      repeatInstruction();
    } else if (q.includes("hambatan") || q.includes("warning") || q.includes("bahaya")) {
      speakNextWarning();
    } else if (q.includes("jauh") || q.includes("sisa") || q.includes("berapa")) {
      speakRemaining();
    } else {
      announceLiveRegion("Perintah tidak dikenali. Coba: ulangi instruksi, ada hambatan apa, atau berapa jauh lagi.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.finalTranscript]);

  if (loading) {
    return <LoadingState label="Menyiapkan perjalanan…" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Perjalanan tidak tersedia"
        description={error}
        action={
          <Link
            href="/route"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-12 bg-primary px-5 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Kembali ke perencana rute
          </Link>
        }
      />
    );
  }

  if (!selected || !activeProfile) {
    return <ErrorState title="Perjalanan tidak tersedia" description={error ?? "Belum ada rute untuk ditampilkan."} />;
  }

  const isVisual = activeProfile === "VISUAL_NAVIGATION";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      {screen === "brief" ? (
        <BriefScreen
          route={selected}
          onSpeakBrief={speakBrief}
          onStart={startNavigation}
          onSwitchRoute={switchRoute}
          otherRoute={routes?.find((r) => r.id !== selected.id) ?? null}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">
                {selected.fromName} → {selected.toName}
              </span>
            </p>
            <Badge tone={isVisual ? "neutral" : "success"} symbol={isVisual ? "👁️" : "♿"}>
              {isVisual ? "Navigasi audio" : "Navigasi kursi roda"}
            </Badge>
            <Badge tone={realStreet ? "success" : "neutral"} symbol={realStreet ? "🛣" : "◇"}>
              {realStreet ? "Rute mengikuti jalan nyata" : "Rute estimasi demo"}
            </Badge>
          </div>

          <div>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="sr-only" aria-live="polite">
              Progres perjalanan {progress} persen.
            </p>
          </div>

          <section aria-label="Peta perjalanan 3D realtime" className="space-y-2">
            <JourneyMap
              key={selected.id}
              route={selected}
              stepIndex={stepIndex}
              onStepReached={handleAutoStep}
              onNext={nextStep}
              onPrev={prevStep}
            />
            <p className="px-1 text-xs text-muted-foreground">
              Peta 3D langsung memandumu bergerak realtime. Titik biru berdenyut = posisimu · garis biru = rute ·
              garis kuning = guiding block jalan (jika terpetakan).
            </p>
          </section>

          <section
            aria-label="Instruksi saat ini"
            className={cn(
              "rounded-20 border-2 p-6 shadow-card",
              isVisual ? "border-primary bg-card" : "border-border bg-card",
            )}
          >
            {isArrival ? (
              <>
                <p className="text-h3 font-bold text-success">Tiba di tujuan</p>
                <p className="mt-2 text-lg">{selected.toName}</p>
                {selected.facilities.length > 0 ? (
                  <ul className="mt-4 space-y-1">
                    {selected.facilities.map((facility) => (
                      <li key={`${facility.id}-${facility.distanceMeters}`} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        <span>{facility.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <>
                <p className={cn("font-bold leading-snug", isVisual ? "text-[2rem]" : "text-h3")}>
                  {currentStep?.instruction}
                </p>
                {currentStep?.barrierLabel ? (
                  <p className="mt-3 flex items-start gap-2 rounded-12 border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{currentStep.barrierLabel}</span>
                  </p>
                ) : null}
                {currentStep?.facilityLabel ? (
                  <p className="mt-3 flex items-start gap-2 rounded-12 border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{currentStep.facilityLabel}</span>
                  </p>
                ) : null}
                <p className="mt-4 text-sm text-muted-foreground">
                  Sisa sekitar {remainingMeters} m · Segmen {Math.min(stepIndex + 1, selected.steps.length - 1)} dari{" "}
                  {selected.steps.length - 1}
                </p>
              </>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={repeatInstruction} aria-label="Ulangi instruksi, tombol besar 48px" className="h-14 text-lg font-black">
              <Volume2 className="h-6 w-6" aria-hidden="true" />
              Ulangi 🔊
            </Button>
            {!isArrival && !isVisual ? (
              <>
                <Button variant="outline" size="lg" onClick={prevStep} disabled={stepIndex === 0} aria-label="Segmen sebelumnya" className="h-14">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  Sebelumnya
                </Button>
                <Button variant="outline" size="lg" onClick={nextStep} aria-label="Segmen berikutnya, lanjutkan perjalanan" className="h-14 border-2 border-primary font-black">
                  Lanjut
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </>
            ) : null}
            {isVisual ? (
              <>
                <Button variant="secondary" size="lg" onClick={speakNextWarning} aria-label="Ada hambatan apa?">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  Hambatan?
                </Button>
                <Button variant="secondary" size="lg" onClick={speakRemaining} aria-label="Berapa jauh lagi?">
                  <Crosshair className="h-5 w-5" aria-hidden="true" />
                  Berapa jauh lagi?
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="lg" onClick={nextStep}>
                Lanjut
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
          </div>

          {voice.supported ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (voice.status === "listening" ? voice.stop() : voice.start())}
                aria-pressed={voice.status === "listening"}
              >
                <Mic className={cn("h-4 w-4", voice.status === "listening" && "text-danger")} aria-hidden="true" />
                {voice.status === "listening" ? "Hentikan perintah suara" : "Perintah suara"}
              </Button>
              {voice.interim ? <p className="text-xs text-muted-foreground">{voice.interim}</p> : null}
            </div>
          ) : null}

          {!isVisual ? (
            <section aria-label="Kondisi rute" className="rounded-16 border border-border bg-card p-4 shadow-card">
              <h2 className="font-semibold">Kondisi di sepanjang rute</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {selected.facilities.slice(0, 4).map((facility) => (
                  <li key={`${facility.id}-${facility.distanceMeters}`} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 text-success">✓ {facility.symbol}</span>
                    <span>{facility.label}</span>
                  </li>
                ))}
                {selected.barriers.slice(0, 4).map((barrier) => (
                  <li key={`${barrier.id}-${barrier.distanceMeters}`} className="flex items-start gap-2 text-warning">
                    <span aria-hidden="true" className="mt-0.5">⚠ {barrier.symbol}</span>
                    <span>
                      {barrier.label} — sekitar {barrier.distanceMeters} m
                    </span>
                  </li>
                ))}
                {selected.facilities.length === 0 && selected.barriers.length === 0 ? (
                  <li className="text-muted-foreground">Belum ada fitur aksesibilitas yang dilaporkan di rute ini.</li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link
              href="/report"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-12 border border-border bg-background px-5 font-medium text-foreground hover:bg-muted"
            >
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              Laporkan hambatan
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                audio.speak("Perjalanan diakhiri. Semoga sampai dengan selamat.", AudioPriority.GeneralUiFeedback);
                announceLiveRegion("Perjalanan diakhiri.");
                router.replace("/");
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Akhiri perjalanan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface BriefScreenProps {
  route: RouteOption;
  onSpeakBrief: () => void;
  onStart: () => void;
  onSwitchRoute: (id: string) => void;
  otherRoute: RouteOption | null;
}

function BriefScreen({ route, onSpeakBrief, onStart, onSwitchRoute, otherRoute }: BriefScreenProps) {
  return (
    <div className="space-y-6">
      <Link
        href="/route"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke perencana rute
      </Link>

      <header className="rounded-20 border-2 border-primary bg-card p-6 shadow-card">
        <p className="text-sm font-semibold text-primary">
          <Star className="me-1 inline h-4 w-4 fill-current" aria-hidden="true" />
          Ringkasan Perjalanan
        </p>
        <h1 className="mt-2 text-h2 font-bold">Ke: {route.toName}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={scoreTone(route.accessibilityScore)}>
            {route.accessibilityScore !== null ? `${route.accessibilityScore}/100` : "Data belum tersedia"} ·{" "}
            {route.scoreLabel}
          </Badge>
          <Badge tone="neutral">{route.label}</Badge>
          {route.honestNote ? <Badge tone="neutral">D</Badge> : null}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-16 border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Jarak</dt>
          <dd className="mt-1 text-h3 font-bold">{route.distanceLabel}</dd>
        </div>
        <div className="rounded-16 border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Estimasi waktu</dt>
          <dd className="mt-1 text-h3 font-bold">{route.durationLabel}</dd>
        </div>
      </dl>

      <section className="rounded-16 border border-border bg-card p-4 shadow-card">
        <h2 className="font-semibold">Hal yang perlu diketahui</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              {route.barriers.length === 0
                ? "Tidak ada hambatan yang dilaporkan pada rute ini."
                : `${route.barriers.length} hambatan diketahui di rute ini.`}
            </span>
          </li>
          {route.barriers.slice(0, 3).map((barrier) => (
            <li key={`${barrier.id}-${barrier.distanceMeters}`} className="flex items-start gap-2 ps-5 text-warning">
              <span>{barrier.label}</span>
            </li>
          ))}
          {route.facilities.length > 0
            ? route.facilities.slice(0, 3).map((facility) => (
                <li key={`${facility.id}-${facility.distanceMeters}`} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{facility.label}</span>
                </li>
              ))
            : null}
        </ul>
        {route.honestNote ? (
          <p className="mt-4 rounded-10 bg-muted px-3 py-2 text-xs text-muted-foreground">{route.honestNote}</p>
        ) : null}
      </section>

      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={() => void onStart()}>
          <Navigation2 className="h-5 w-5" aria-hidden="true" />
          Mulai Navigasi
        </Button>
        <Button variant="outline" size="lg" onClick={onSpeakBrief}>
          <Volume2 className="h-5 w-5" aria-hidden="true" />
          Dengarkan ringkasan
        </Button>
      </div>

      {otherRoute ? (
        <div className="rounded-16 border border-border bg-card p-4 shadow-card">
          <p className="text-sm">
            <span className="font-medium">Alternatif tersedia:</span> {otherRoute.durationLabel} ·{" "}
            {otherRoute.distanceLabel}
            {otherRoute.accessibilityScore !== null ? ` · skor ${otherRoute.accessibilityScore}/100` : ""}
          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => onSwitchRoute(otherRoute.id)}>
            <Rabbit className="h-4 w-4" aria-hidden="true" />
            Lihat {otherRoute.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}