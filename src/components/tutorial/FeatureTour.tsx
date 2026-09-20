"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, SkipForward, Volume2, X } from "lucide-react";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { announceLiveRegion } from "@/lib/announcement";
import { isDisabilityUserType } from "@/lib/constants";
import {
  FEATURE_TOURS,
  markTourSeen,
  tourForPath,
  tourSeen,
  type TourConfig,
  type TourFeature,
  type TourStep,
} from "@/lib/tutorials";
import { AudioPriority } from "@/types";
import { cn } from "@/lib/cn";

interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Phase = "closed" | "intro" | "steps";

const CARD_W = 384;
const CARD_H_ESTIMATE = 340;
const SAFE = 12;

function viewportWidth(): number {
  return typeof window === "undefined" ? 1024 : window.innerWidth;
}

/** Tooltip menyesuaikan posisi elemen; di layar kecil berubah menjadi bottom sheet. */
function cardPosition(spot: Spot, cardHeight: number): CSSProperties {
  const vw = viewportWidth();
  const vh = typeof window === "undefined" ? 600 : window.innerHeight;
  if (vw < 768) {
    return { bottom: 16, left: 12, right: 12 };
  }
  const h = Math.min(cardHeight, vh - SAFE * 2) || CARD_H_ESTIMATE;
  const top = (y: number) => Math.max(SAFE, Math.min(y, vh - h - SAFE));
  const centerLeft = () => Math.max(SAFE, (vw - CARD_W) / 2);

  // Kanan elemen
  const rightX = spot.left + spot.width + 16;
  if (rightX + CARD_W <= vw - SAFE) {
    return { top: top(spot.top), left: rightX };
  }
  // Kiri elemen
  const leftX = spot.left - CARD_W - 16;
  if (leftX >= SAFE) {
    return { top: top(spot.top), left: leftX };
  }
  // Bawah elemen
  const below = spot.top + spot.height + 16;
  if (below + h <= vh - SAFE) {
    return { top: below, left: centerLeft() };
  }
  // Atas elemen
  const above = spot.top - h - 16;
  if (above >= SAFE) {
    return { top: above, left: centerLeft() };
  }
  // Terakhir: pojok kanan bawah
  return { bottom: 16, right: 16 };
}

/**
 * Tutorial interaktif per-fiturt — config-driven (lihat ./src/lib/tutorials.ts).
 * Auto-mulai sekali untuk tiap fitur; bisa dipicu ulang dengan startGuideTour(feature).
 */
export function FeatureTour() {
  const { userType } = useAccessibilityProfile();
  const audio = useAudioManager();
  const pathname = usePathname();
  const titleId = useId();

  const [config, setConfig] = useState<TourConfig | null>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const readAloud = isDisabilityUserType(userType);

  const speak = useCallback(
    (sentence: string) => {
      announceLiveRegion(sentence, { assertive: true });
      if (readAloud) audio.speak(sentence, AudioPriority.UserRequestedInformation);
    },
    [audio, readAloud],
  );

  const target = useCallback((step: TourStep): HTMLElement | null => {
    return document.querySelector(step.target) as HTMLElement | null;
  }, []);

  /** Ukur spotlight + posisikan kartu; scroll elemen ke tengah. */
  const place = useCallback((step: TourStep) => {
    const el = target(step);
    if (!el) {
      setSpot(null);
      return;
    }
    el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setSpot({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }, 320);
  }, [target]);

  useEffect(() => {
    if (!spot || phase === "closed") return;
    const h = cardRef.current?.getBoundingClientRect().height ?? 0;
    setStyle(cardPosition(spot, h));
  }, [spot, phase]);

  const announceStep = useCallback(
    (next: number, steps: readonly TourStep[]) => {
      const step = steps[next];
      if (!step) return;
      speak(`Langkah ${next + 1} dari ${steps.length}. ${step.title}. ${step.text}`);
    },
    [speak],
  );

  const goTo = useCallback(
    (next: number, steps: readonly TourStep[]) => {
      setIndex(next);
      const step = steps[next];
      if (step) {
        place(step);
        announceStep(next, steps);
      }
    },
    [place, announceStep],
  );

  /** Tunggu elemen target muncul (mis. formulir report yang baru terlihat setelah memilih cara). */
  const waitFor = useCallback(
    (step: TourStep, timeoutMs = 5000): Promise<boolean> => {
      return new Promise((resolve) => {
        if (target(step)) {
          resolve(true);
          return;
        }
        const started = Date.now();
        const timer = window.setInterval(() => {
          if (target(step)) {
            window.clearInterval(timer);
            resolve(true);
            return;
          }
          if (Date.now() - started > timeoutMs) {
            window.clearInterval(timer);
            resolve(false);
          }
        }, 300);
      });
    },
    [target],
  );

  const advance = useCallback(
    async (steps: readonly TourStep[], doneOnLast: (sawEnd: boolean) => void) => {
      const next = indexRef.current + 1;
      if (next >= steps.length) {
        doneOnLast(true);
        return;
      }
      const step = steps[next];
      const found = await waitFor(step);
      if (!found) {
        const later = steps.slice(next + 1).findIndex((s) => target(s));
        if (later >= 0) {
          goTo(next + 1 + later, steps);
        } else {
          speak("Elemen langkah ini belum tampil. Selesaikan langkah sebelumnya, lalu tekan Lanjut lagi.");
        }
        return;
      }
      goTo(next, steps);
    },
    [waitFor, target, goTo, speak],
  );

  /** Tutup tutorial; tandai sudah dilihat agar tidak muncul otomatis lagi. */
  const close = useCallback(
    (finished: boolean) => {
      if (!config) return;
      markTourSeen(config);
      setPhase("closed");
      setSpot(null);
      setStyle({});
      if (finished) {
        speak("Tutorial selesai. Semua siap digunakan.");
      }
    },
    [config, speak],
  );

  const openTour = useCallback(
    (feature: TourFeature) => {
      const cfg = FEATURE_TOURS[feature];
      if (!cfg) return;
      setConfig(cfg);
      setIndex(0);
      setPhase(cfg.intro ? "intro" : "steps");
      if (cfg.intro) {
        speak(`${cfg.intro.title}. ${cfg.intro.text}`);
      }
    },
    [speak],
  );

  const runSteps = useCallback(
    (cfg: TourConfig) => {
      setPhase("steps");
      const available = cfg.steps.filter((s) => target(s));
      if (available.length === 0) {
        setConfig(null);
        setPhase("closed");
        return;
      }
      setIndex(0);
      place(available[0]);
      announceStep(0, available);
    },
    [target, place, announceStep],
  );

  // Auto-start pertama kali per fitur (semua pengguna, sekali saja).
  useEffect(() => {
    if (phase !== "closed" || typeof window === "undefined") return;
    const cfg = tourForPath(pathname);
    if (!cfg) return;
    if (tourSeen(cfg)) return;
    const t = window.setTimeout(() => {
      // Target utama ada? Kalau tidak, tunda dan coba lagi.
      const first = cfg.steps[0];
      if (first && target(first)) {
        openTour(cfg.feature);
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [pathname, phase, openTour, target]);

  // Replay manual dari tombol "Lihat Tutorial" ({ startGuideTour("report") }).
  useEffect(() => {
    const handler = (event: Event) => {
      const feature = (event as CustomEvent<TourFeature>).detail ?? "home";
      openTour(feature);
    };
    window.addEventListener("anapsi:start-tour", handler);
    return () => window.removeEventListener("anapsi:start-tour", handler);
  }, [openTour]);

  // Recalculate spotlight saat resize/scroll.
  useEffect(() => {
    if (phase === "closed" || !config) return;
    const rebuild = () => {
      const step = config.steps[indexRef.current];
      if (step) place(step);
    };
    window.addEventListener("resize", rebuild);
    window.addEventListener("scroll", rebuild, true);
    return () => {
      window.removeEventListener("resize", rebuild);
      window.removeEventListener("scroll", rebuild, true);
    };
  }, [phase, config, place]);

  // Tutup dialog tatkala berpindah halaman (auto-start baru bisa muncul di path baru).
  // Gunakan pola "adjust state during render" agar tidak sync-setState dalam effect.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setPhase("closed");
    setSpot(null);
    setStyle({});
  }

  // Keyboard + focus management untuk dialog.
  useEffect(() => {
    if (phase === "closed") return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = cardRef.current;
    panel?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
        return;
      }
      if (event.key === "Tab" && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [phase, close]);

  if (phase === "closed" || !config) return null;

  const steps = config.steps;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      {/* Redup penuh — pointer-events-none agar halaman tetap bisa digunakan. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-fade-in bg-slate-950/55" />
      {/* Spotlight cutout */}
      {spot && phase === "steps" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-16"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 4px var(--color-ring), 0 0 0 9999px rgba(2, 6, 23, 0.55)",
            transition: "top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease",
          }}
        />
      ) : null}

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-auto fixed z-10 max-h-[78vh] w-full max-w-96 animate-slide-up overflow-y-auto rounded-20 border-2 border-primary bg-card p-5 shadow-card focus:outline-none"
        style={style}
      >
        {phase === "intro" ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
                Tutorial {config.label}
              </p>
              <button
                type="button"
                onClick={() => close(false)}
                aria-label="Lewati tutorial"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <h2 id={titleId} className="mt-4 text-h2 font-black">
              {config.intro.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{config.intro.text}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runSteps(config)}
                className="inline-flex h-12 items-center gap-2 rounded-full primary-solid px-6 font-black text-primary-foreground shadow-soft hover:opacity-90"
              >
                Mulai Tutorial <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => close(false)}
                className="inline-flex h-12 items-center rounded-full border-2 border-border bg-background px-5 font-bold hover:bg-muted"
              >
                Lewati
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Tutorial {config.label} · Langkah {index + 1} dari {steps.length}
              </p>
              <button
                type="button"
                onClick={() => close(false)}
                aria-label="Lewati tutorial"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2 flex gap-1.5" aria-hidden="true">
              {steps.map((s, i) => (
                <span
                  key={s.target}
                  className={cn("h-2 rounded-full", i === index ? "w-6 bg-primary" : "w-2 bg-input")}
                />
              ))}
            </div>

            <h2 id={titleId} className="mt-3 text-h2 font-black" tabIndex={-1}>
              {step?.title}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{step?.text}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(Math.max(0, index - 1), steps)}
                disabled={index === 0}
                className="inline-flex h-12 items-center gap-1 rounded-full border-2 border-border bg-background px-4 font-bold disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Kembali
              </button>
              <button
                type="button"
                onClick={() => step && speak(`${step.title}. ${step.text}`)}
                aria-label="Dengarkan ulang penjelasan langkah ini"
                className="inline-flex h-12 items-center gap-1 rounded-full border-2 border-border bg-background px-4 font-bold hover:bg-muted"
              >
                <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" /> Ulang
              </button>
              <button
                type="button"
                onClick={() => void advance(steps, close)}
                className="inline-flex h-12 items-center gap-1 rounded-full primary-solid px-5 font-black text-primary-foreground shadow-soft hover:opacity-90"
              >
                {isLast ? "Selesai" : "Lanjut"} <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => close(false)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" /> Lewati semua
            </button>
          </div>
        )}
      </div>
    </div>
  );
}