"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Accessibility, AlertTriangle, ChevronDown, HelpCircle, ShieldCheck, XCircle } from "lucide-react";
import type { AccessibilityFactor, ConfidenceLevel, ScoreLevel } from "@/types";
import { cn } from "@/lib/cn";

const LEVELS: Record<ScoreLevel, { symbol: string; label: string; icon: LucideIcon }> = {
  accessible: { symbol: "✓", label: "Sangat Aksesibel", icon: Accessibility },
  limited: { symbol: "⚠", label: "Aksesibilitas Terbatas", icon: AlertTriangle },
  "not-accessible": { symbol: "✕", label: "Hambatan Signifikan", icon: XCircle },
  unknown: { symbol: "?", label: "Data Belum Tersedia", icon: HelpCircle },
};

const FACTOR_KIND: Record<AccessibilityFactor["kind"], string> = {
  positive: "✓",
  negative: "✕",
  neutral: "·",
};

const CONFIDENCE_LABEL: Record<Exclude<ConfidenceLevel, null>, string> = {
  high: "Keandalan data: tinggi",
  medium: "Keandalan data: sedang",
  low: "Keandalan data: rendah (sedikit laporan)",
};

interface AccessibilityScoreProps {
  score?: number | null;
  factors?: AccessibilityFactor[];
  label: string;
  confidence?: ConfidenceLevel | null;
  freshness?: string;
}

export function AccessibilityScore({
  score,
  factors = [],
  label,
  confidence,
  freshness,
}: AccessibilityScoreProps) {
  const [open, setOpen] = useState(false);
  const level: ScoreLevel =
    score == null ? "unknown" : score >= 80 ? "accessible" : score >= 40 ? "limited" : "not-accessible";
  const meta = LEVELS[level];
  const Icon = meta.icon;

  return (
    <section
      role="group"
      aria-label={`Skor: ${label}, ${meta.label}`}
      className={cn("rounded-16 border border-border bg-card p-4 shadow-card")}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-16 border-2 border-foreground/50 text-2xl font-bold",
            level === "not-accessible" && "text-danger",
            level === "limited" && "text-warning",
            level === "accessible" && "text-success",
          )}
        >
          {score != null ? score.toFixed(0) : meta.symbol}
        </span>
        <div>
          <p className="font-semibold">{label}</p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>
              {score != null ? `${score.toFixed(0)} dari 100 — ` : ""}
              {meta.label}
            </span>
          </p>
          {confidence ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {CONFIDENCE_LABEL[confidence]}
            </p>
          ) : null}
          {freshness ? <p className="mt-0.5 text-xs text-muted-foreground">Terakhir diperbarui: {freshness}</p> : null}
        </div>
      </div>

      {score != null ? (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
            {open ? "Tutup detail" : "Lihat detail"}
          </button>
          {open ? (
            <div className="mt-2">
              <h3 className="text-sm font-semibold">Apa yang memengaruhi skor ini?</h3>
              {factors.length > 0 ? (
                <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
                  {factors.map((factor) => (
                    <li key={factor.label} className="flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "w-4 shrink-0 text-center font-bold",
                          factor.kind === "positive" && "text-success",
                          factor.kind === "negative" && "text-danger",
                        )}
                      >
                        {FACTOR_KIND[factor.kind]}
                      </span>
                      <span>{factor.label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Belum ada faktor yang dapat ditampilkan.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Belum ada cukup data untuk menilai. Skor tidak dibuat-buat dari data kosong.
        </p>
      )}
    </section>
  );
}