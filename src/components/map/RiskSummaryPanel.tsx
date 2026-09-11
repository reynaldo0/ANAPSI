"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Accessibility, AlertTriangle, ArrowRight, CheckCircle2, Crosshair, Navigation2, RefreshCw, Route, X } from "lucide-react";
import { announceLiveRegion } from "@/lib/announcement";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { LatLng } from "@/lib/geo";
import type { AccessibilityProfileType, PlaceSummary, RouteOption } from "@/types";

interface Props {
  place: PlaceSummary;
  origin: LatLng;
  fromLabel: string;
  profile: AccessibilityProfileType;
  onClose: () => void;
  onChangePlace: () => void;
}

interface RoutesResponse {
  ok: boolean;
  data?: { routes: RouteOption[]; real?: boolean };
  error?: { message: string };
}

function scoreTone(score: number | null): BadgeTone {
  if (score === null) return "neutral";
  if (score >= 80) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

export function RiskSummaryPanel({ place, origin, fromLabel, profile, onClose, onChangePlace }: Props) {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteOption[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [real, setReal] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin,
            originName: fromLabel,
            destinationId: place.id,
            profile,
          }),
        });
        const body = (await response.json()) as RoutesResponse;
        if (!response.ok || !body.data || body.data.routes.length === 0) {
          if (!cancelled) setError(body.error?.message ?? "Rute belum dapat dibuat untuk lokasi ini. Coba lokasi lain.");
          return;
        }
        if (!cancelled) {
          setRoutes(body.data.routes);
          setReal(body.data.real === true);
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
  }, [origin, fromLabel, place.id, profile]);

  useEffect(() => {
    headingRef.current?.focus();
    announceLiveRegion(`Menghitung ringkasan risiko perjalanan menuju ${place.name}.`, { assertive: true });
  }, [place.name]);

  const startNavigation = () => {
    if (!routes || routes.length === 0) return;
    const chosen = routes.find((r) => r.recommended) ?? routes[0];
    announceLiveRegion(`Navigasi menuju ${place.name} dimulai. Peta perjalanan dibuka.`, { assertive: true });
    router.push(
      `/journey?route=${encodeURIComponent(chosen.id)}&from=${encodeURIComponent(fromLabel)}&to=${encodeURIComponent(place.name)}&destination=${encodeURIComponent(place.id)}&lat=${origin.lat}&lng=${origin.lng}`,
    );
  };

  const chosen = routes?.find((r) => r.recommended) ?? routes?.[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Ringkasan risiko perjalanan">
      <button
        type="button"
        aria-label="Tutup ringkasan risiko"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
      />
      <div className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-24 border border-border bg-card shadow-float animate-slide-up sm:mx-4 sm:mb-0 sm:max-w-xl sm:rounded-24">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-14 bg-warning-soft text-warning">
              <Route className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="label-uppercase text-[11px] text-warning">Sebelum berangkat</p>
              <h2 ref={headingRef} tabIndex={-1} className="truncate text-lg font-black leading-tight focus:outline-none">
                Resume Risiko: {place.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-12 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center" role="status" aria-live="polite">
              <Route className="mx-auto h-8 w-8 animate-pulse text-primary" aria-hidden="true" />
              <p className="mt-3 font-bold">Menganalisis rute jalan nyata…</p>
              <p className="mt-1 text-sm text-muted-foreground">Mengecek jarak, waktu, dan hambatan di sepanjang jalur.</p>
            </div>
          ) : error ? (
            <p className="rounded-12 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : chosen ? (
            <div className="space-y-4">
              <section aria-label="Ringkasan rute" className="rounded-20 border-2 border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black">{place.name}</h3>
                    {place.address ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{place.address}</p> : null}
                  </div>
                  <Badge tone={scoreTone(chosen.accessibilityScore)} symbol={chosen.accessibilityScore !== null ? "♿" : "?"}>
                    {chosen.accessibilityScore !== null ? `${chosen.accessibilityScore}/100` : "Belum ada data"} · {chosen.scoreLabel}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-14 bg-muted p-3">
                    <dt className="text-[11px] font-semibold text-muted-foreground">Jarak</dt>
                    <dd className="mt-1 text-lg font-black">{chosen.distanceLabel}</dd>
                  </div>
                  <div className="rounded-14 bg-muted p-3">
                    <dt className="text-[11px] font-semibold text-muted-foreground">Perkiraan waktu</dt>
                    <dd className="mt-1 text-lg font-black">{chosen.durationLabel}</dd>
                  </div>
                  <div className="rounded-14 bg-muted p-3">
                    <dt className="text-[11px] font-semibold text-muted-foreground">Rute</dt>
                    <dd className="mt-1 text-lg font-black">{real ? "Jalan nyata" : "Estimasi"}</dd>
                  </div>
                </dl>
              </section>

              <section aria-label="Hambatan di rute" className="rounded-20 border-2 border-border bg-background p-4">
                <h3 className="flex items-center gap-2 font-black">
                  <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                  Apa yang harus kamu tahu
                </h3>
                {chosen.barriers.length === 0 ? (
                  <p className="mt-3 flex items-start gap-2 rounded-12 border border-success/40 bg-success-soft px-3 py-2 text-sm text-success">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    Tidak ada hambatan yang dilaporkan pada rute ini.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {chosen.barriers.slice(0, 4).map((barrier) => (
                      <li key={`${barrier.id}-${barrier.distanceMeters}`} className="flex items-start gap-2 text-sm">
                        <span aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-danger-soft text-center text-[11px] font-black leading-5 text-danger">!</span>
                        <span>
                          <strong>{barrier.label.split(":")[0]}</strong>
                          {barrier.label.includes(":") ? `: ${barrier.label.split(":").slice(1).join(":")}` : ""}
                          <span className="text-muted-foreground"> — {Math.max(0, Math.round(barrier.distanceMeters))} m dari awal</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="mt-3 space-y-2">
                  {chosen.facilities.slice(0, 3).map((facility) => (
                    <li key={`${facility.id}-${facility.distanceMeters}`} className="flex items-start gap-2 text-sm text-success">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{facility.label}</span>
                    </li>
                  ))}
                </ul>
                {chosen.honestNote ? (
                  <p className="mt-4 rounded-10 bg-muted px-3 py-2 text-xs text-muted-foreground">{chosen.honestNote}</p>
                ) : null}
              </section>

              <section aria-label="Saran berjalan" className="flex items-start gap-2 rounded-16 border-2 border-primary/40 bg-primary-soft px-3 py-3 text-sm">
                <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p>
                  Selama navigasi kamu dapat berkata <strong>&quot;ulangi instruksi&quot;</strong>, <strong>&quot;ada hambatan apa&quot;</strong>, atau{" "}
                  <strong>&quot;berapa jauh lagi&quot;</strong>. Peta bergerak otomatis mengikutimu.
                </p>
              </section>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-border p-4">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={startNavigation}
              disabled={!chosen}
              className={cn(
                "inline-flex h-14 items-center justify-center gap-2 rounded-16 px-6 text-lg font-black text-primary-foreground shadow-card transition-opacity",
                "primary-solid",
                !chosen && "cursor-not-allowed opacity-60",
              )}
            >
              <Navigation2 className="h-6 w-6" aria-hidden="true" />
              Mulai Navigasi
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onChangePlace}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-14 border-2 border-border bg-background px-4 font-bold hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Ganti tujuan
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-14 border-2 border-border bg-background px-4 font-bold hover:bg-muted"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                Lihat di peta
              </button>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Accessibility className="h-4 w-4 shrink-0" aria-hidden="true" />
            Ringkasan berdasarkan data OpenStreetMap dan laporan komunitas terkini.
          </p>
        </footer>
      </div>
    </div>
  );
}