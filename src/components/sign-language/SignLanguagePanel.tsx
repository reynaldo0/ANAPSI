"use client";

import { useMemo, useState } from "react";
import { Hand, Pause, Play, RotateCcw, X } from "lucide-react";
import { AvatarFigure } from "@/components/sign-language/AvatarFigure";
import { useSignLanguagePlayer, type SignSpeed } from "@/components/sign-language/useSignLanguagePlayer";
import { FALLBACK_POSE, GLOSS_BY_ID } from "@/lib/sign-language/gloss-dictionary";
import { textToScript, type SignPhrase } from "@/lib/sign-language/text-to-gloss";
import { useSignLanguage } from "@/lib/state/SignLanguageContext";
import { cn } from "@/lib/cn";

interface SignLanguagePanelProps {
  title: string;
  text: string;
  onClose?: () => void;
  className?: string;
}

function signLabel(id: string): string {
  return GLOSS_BY_ID.get(id)?.label ?? FALLBACK_POSE.label;
}

function signDescription(id: string): string {
  return GLOSS_BY_ID.get(id)?.description ?? FALLBACK_POSE.description;
}

interface PhraseEntry {
  text: string;
  signs: { id: string; globalIndex: number; label: string; description: string }[];
}

function buildPhraseEntries(script: SignPhrase[]): PhraseEntry[] {
  let i = 0;
  return script.map((p) => ({
    text: p.text,
    signs: p.signs.map((id) => ({
      id,
      globalIndex: i++,
      label: signLabel(id),
      description: signDescription(id),
    })),
  }));
}

const SPEEDS: { value: SignSpeed; label: string }[] = [
  { value: 0.75, label: "Lambat" },
  { value: 1, label: "Normal" },
  { value: 1.3, label: "Cepat" },
];

export function SignLanguagePanel({ title, text, onClose, className }: SignLanguagePanelProps) {
  const { enabled } = useSignLanguage();
  const script = useMemo(() => textToScript(text ?? ""), [text]);
  const allSigns = useMemo(() => script.flatMap((p) => p.signs), [script]);
  const textKey = useMemo(() => allSigns.join("|"), [allSigns]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [speed, setSpeed] = useState<SignSpeed>(1);

  const open = enabled && allSigns.length > 0 && dismissed !== textKey;

  const player = useSignLanguagePlayer(allSigns, { autoPlay: true, speed });
  const { state } = player;

  if (!enabled || !open) return null;
  if (allSigns.length === 0) return null;

  const phrases = buildPhraseEntries(script);

  return (
    <section
      aria-label={`${title} dalam bahasa isyarat`}
      className={cn("overflow-hidden rounded-20 border-2 border-primary/40 bg-card shadow-card", className)}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Hand className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-sm font-black">
          Bahasa Isyarat · {title}
        </p>
        <select
          value={speed}
          onChange={(e) => {
            const next = Number(e.target.value) as SignSpeed;
            setSpeed(next);
            player.setSpeed(next);
          }}
          aria-label="Kecepatan bahasa isyarat"
          className="h-9 rounded-8 border-2 border-border bg-background px-2 text-xs font-bold text-foreground"
        >
          {SPEEDS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={state.playing ? player.pause : player.play}
          aria-label={state.playing ? "Jeda bahasa isyarat" : "Putar bahasa isyarat"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-10 border-2 border-border bg-background text-foreground hover:bg-muted"
        >
          {state.playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={player.restart}
          aria-label="Ulangi bahasa isyarat dari awal"
          className="inline-flex h-9 w-9 items-center justify-center rounded-10 border-2 border-border bg-background text-foreground hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(textKey);
            onClose?.();
          }}
          aria-label="Tutup bahasa isyarat"
          className="inline-flex h-9 w-9 items-center justify-center rounded-10 border-2 border-border bg-background text-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="relative px-3 pt-2 text-foreground">
        <AvatarFigure render={state.render} className="mx-auto max-w-[170px]" />
        <p className="sr-only" aria-live="polite">
          {state.currentDescription}
        </p>
        <div className="absolute inset-x-0 bottom-2 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-primary/50 bg-background px-3 py-1 text-sm font-black text-foreground shadow-card">
            <span className="text-primary">{state.currentLabel}</span>
            {state.total > 0 ? (
              <span className="text-xs font-semibold text-muted-foreground">
                {Math.min(state.index + 1, state.total)}/{state.total}
              </span>
            ) : null}
            {state.done ? <span className="text-xs text-success">· selesai</span> : null}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pt-2.5">
        {state.total > 0 ? (
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Gerakan:</span>
        ) : null}
        {phrases.map((phrase, pi) => (
          <span key={pi} className="flex flex-wrap items-center gap-1.5">
            {phrase.signs.map((sign) => (
              <span
                key={sign.globalIndex}
                className={cn(
                  "inline-flex items-center rounded-8 border-2 px-2 py-0.5 text-xs font-bold transition-colors",
                  sign.globalIndex === state.index && !state.done
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {sign.label}
              </span>
            ))}
            {pi < phrases.length - 1 ? (
              <span className="mx-1 text-muted-foreground" aria-hidden="true">
                ·
              </span>
            ) : null}
          </span>
        ))}
      </div>

      <details className="border-t border-border px-4 py-2.5">
        <summary className="cursor-pointer text-sm font-bold text-muted-foreground hover:text-foreground">
          Tampilkan teks alternatif
        </summary>
        <p className="mt-2 rounded-10 bg-muted px-3 py-2 text-sm">{text}</p>
      </details>
    </section>
  );
}