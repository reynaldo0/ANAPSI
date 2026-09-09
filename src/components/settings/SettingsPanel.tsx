"use client";

import { useId } from "react";
import { Moon, Sun, Monitor, ZoomIn, ZoomOut, Contrast, Minimize2 } from "lucide-react";
import { useAppearanceSettings } from "@/lib/state/SettingsContext";
import { announceLiveRegion } from "@/lib/announcement";
import { cn } from "@/lib/cn";
import type { AppearanceTheme } from "@/types";

const THEME_OPTIONS: { value: AppearanceTheme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Ikuti sistem", icon: Monitor },
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
];

const TEXT_SIZES = [
  { ratio: 0.875, label: "Kecil" },
  { ratio: 1, label: "Normal" },
  { ratio: 1.125, label: "Besar" },
  { ratio: 1.25, label: "Sangat Besar" },
];

export function SettingsPanel() {
  const { settings, setTheme, toggleHighContrast, toggleReduceMotion, setTextSize } =
    useAppearanceSettings();
  const themeGroupId = useId();
  const textSizeGroupId = useId();

  const handleTheme = (theme: AppearanceTheme) => {
    setTheme(theme);
    const label = THEME_OPTIONS.find((o) => o.value === theme)?.label ?? theme;
    announceLiveRegion(`Tema diubah ke ${label}.`);
  };

  const handleHighContrast = () => {
    toggleHighContrast();
    announceLiveRegion(
      settings.highContrast ? "Mode kontras tinggi dinonaktifkan." : "Mode kontras tinggi diaktifkan.",
    );
  };

  const handleReduceMotion = () => {
    toggleReduceMotion();
    announceLiveRegion(
      settings.reduceMotion ? "Kurangi animasi dinonaktifkan." : "Kurangi animasi diaktifkan.",
    );
  };

  const handleTextSize = (ratio: number) => {
    setTextSize(ratio);
    const label = TEXT_SIZES.find((s) => s.ratio === ratio)?.label ?? "normal";
    announceLiveRegion(`Ukuran teks diubah ke ${label}.`);
  };

  return (
    <div className="space-y-8">
      {/* --- Tema --- */}
      <section aria-labelledby={`${themeGroupId}-heading`}>
        <h2 id={`${themeGroupId}-heading`} className="mb-3 text-h3 font-semibold">
          Tema tampilan
        </h2>
        <div
          role="radiogroup"
          aria-labelledby={`${themeGroupId}-heading`}
          className="grid grid-cols-3 gap-2"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = settings.theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-16 border-2 px-3 py-4 text-sm font-medium transition-all focus-visible:outline-offset-2",
                  selected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
                {selected ? <span className="sr-only"> (dipilih)</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* --- Ukuran teks --- */}
      <section aria-labelledby={`${textSizeGroupId}-heading`}>
        <h2 id={`${textSizeGroupId}-heading`} className="mb-3 text-h3 font-semibold">
          Ukuran teks
        </h2>
        <div
          role="radiogroup"
          aria-labelledby={`${textSizeGroupId}-heading`}
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {TEXT_SIZES.map(({ ratio, label }) => {
            const selected = settings.textSize === ratio;
            return (
              <button
                key={ratio}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleTextSize(ratio)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-12 border-2 px-2 py-3 transition-all focus-visible:outline-offset-2",
                  selected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  style={{ fontSize: `${ratio}em` }}
                  className="font-semibold leading-none"
                >
                  Aa
                </span>
                <span className="text-xs font-medium">{label}</span>
                {selected ? <span className="sr-only"> (dipilih)</span> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            aria-label="Perkecil teks"
            onClick={() => {
              const current = TEXT_SIZES.findIndex((s) => s.ratio === settings.textSize);
              if (current > 0) handleTextSize(TEXT_SIZES[current - 1].ratio);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-12 border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            disabled={settings.textSize <= TEXT_SIZES[0].ratio}
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex-1 text-center text-sm text-muted-foreground">
            {TEXT_SIZES.find((s) => s.ratio === settings.textSize)?.label ?? "Normal"}
          </div>
          <button
            type="button"
            aria-label="Perbesar teks"
            onClick={() => {
              const current = TEXT_SIZES.findIndex((s) => s.ratio === settings.textSize);
              if (current < TEXT_SIZES.length - 1) handleTextSize(TEXT_SIZES[current + 1].ratio);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-12 border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            disabled={settings.textSize >= TEXT_SIZES[TEXT_SIZES.length - 1].ratio}
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* --- Aksesibilitas --- */}
      <section aria-labelledby="a11y-settings-heading">
        <h2 id="a11y-settings-heading" className="mb-3 text-h3 font-semibold">
          Aksesibilitas
        </h2>
        <div className="space-y-3">
          {/* High Contrast toggle */}
          <div className="flex items-center justify-between rounded-16 border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <Contrast className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-medium">Kontras tinggi</p>
                <p className="text-sm text-muted-foreground">
                  Mempertegas batas dan teks untuk keterbacaan lebih baik.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.highContrast}
              aria-label={`Kontras tinggi: ${settings.highContrast ? "aktif" : "nonaktif"}`}
              onClick={handleHighContrast}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
                settings.highContrast ? "bg-primary" : "bg-input",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform",
                  settings.highContrast ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Reduce Motion toggle */}
          <div className="flex items-center justify-between rounded-16 border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <Minimize2 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-medium">Kurangi animasi</p>
                <p className="text-sm text-muted-foreground">
                  Meminimalkan efek animasi dan transisi di seluruh aplikasi.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reduceMotion}
              aria-label={`Kurangi animasi: ${settings.reduceMotion ? "aktif" : "nonaktif"}`}
              onClick={handleReduceMotion}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring",
                settings.reduceMotion ? "bg-primary" : "bg-input",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform",
                  settings.reduceMotion ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Info note */}
      <p className="rounded-12 bg-muted px-4 py-3 text-sm text-muted-foreground">
        💡 Pengaturan disimpan di perangkat ini. Website tetap dapat digunakan meskipun pengaturan
        khusus dinonaktifkan — kontras dasar sudah memenuhi standar aksesibilitas.
      </p>
    </div>
  );
}
