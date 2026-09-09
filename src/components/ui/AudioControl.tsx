"use client";

import { Pause, Play, Repeat, Square, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAudioManager } from "@/lib/audio/AudioManager";
import { IconButton } from "@/components/ui/IconButton";

export function AudioControl({ className }: { className?: string }) {
  const { enabled, status, pause, resume, stop, repeat, toggleEnabled, currentText, supported } =
    useAudioManager();

  if (!supported) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Audio suara tidak didukung di perangkat ini. Gunakan pembaca layar untuk panduan.
      </p>
    );
  }

  const hasText = Boolean(currentText);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconButton
        label={enabled ? "Matikan audio suara" : "Aktifkan audio suara"}
        onClick={toggleEnabled}
      >
        {enabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      </IconButton>
      <IconButton
        label={status === "paused" ? "Lanjutkan audio" : "Jeda audio"}
        onClick={status === "paused" ? resume : pause}
        disabled={!hasText}
      >
        {status === "paused" ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </IconButton>
      <IconButton label="Ulangi audio terakhir" onClick={repeat} disabled={!hasText}>
        <Repeat aria-hidden="true" />
      </IconButton>
      <IconButton label="Hentikan audio" onClick={stop}>
        <Square aria-hidden="true" />
      </IconButton>
      <span className="sr-only" aria-live="polite">
        Status audio: {status}
      </span>
    </div>
  );
}
