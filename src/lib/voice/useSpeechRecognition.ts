"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { announceLiveRegion } from "@/lib/announcement";

export type MicStatus = "inactive" | "listening" | "processing";

export interface VoiceCopy {
  listening: string;
  ended: string;
  denied: string;
  noSpeech: string;
  interim: (interimText: string) => string;
}

const REPORT_VOICE_COPY: VoiceCopy = {
  listening: "Mikrofon aktif. Silakan berbicara.",
  ended: "Transkripsi selesai.",
  denied: "Akses mikrofon ditolak. Kamu tetap bisa menulis laporan.",
  noSpeech: "Tidak ada suara terdeteksi. Coba tekan lagi dan bicara lebih jelas.",
  interim: (interimText) => `Mendengarkan. ${interimText}`,
};

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { resultIndex?: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
}

function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
    .SpeechRecognition;
  const WK = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
    .webkitSpeechRecognition;
  const ctor = Ctor ?? WK;
  if (!ctor) return null;
  const rec = new ctor();
  return rec;
}

export function useSpeechRecognition(
  voiceCopy: VoiceCopy = REPORT_VOICE_COPY,
  options: { autoRestart?: boolean } = {},
) {
  const { autoRestart = false } = options;
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported] = useState(() => createRecognition() !== null);
  const [status, setStatus] = useState<MicStatus>("inactive");
  const [interim, setInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const autoRestartRef = useRef(autoRestart);
  const sessionStartedRef = useRef(false);
  const silentEndRef = useRef(false);

  useEffect(() => {
    autoRestartRef.current = autoRestart;
  }, [autoRestart]);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  const bindRef = useRef<(rec: SpeechRecognitionLike) => void>(() => {});
  const bind = useCallback(
    (rec: SpeechRecognitionLike) => {
      rec.lang = "id-ID";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        // Mode suara langsung: hanya umumkan sekali saat sesi dimulai, lalu diam-diam.
        if (autoRestartRef.current && sessionStartedRef.current) {
          setStatus("listening");
          return;
        }
        sessionStartedRef.current = true;
        setStatus("listening");
        announceLiveRegion(voiceCopy.listening);
      };

      rec.onend = () => {
        if (silentEndRef.current) {
          silentEndRef.current = false;
          setStatus("inactive");
          return;
        }
        if (autoRestartRef.current) {
          // Tetap mendengarkan: buat sesi baru tanpa mengumumkan ulang.
          const next = createRecognition();
          if (!next) {
            setStatus("inactive");
            sessionStartedRef.current = false;
            return;
          }
          recRef.current = next;
          bindRef.current(next);
          setStatus("listening");
          try {
            next.start();
          } catch {
            setStatus("inactive");
            sessionStartedRef.current = false;
          }
          return;
        }
        announceLiveRegion(voiceCopy.ended);
        setStatus("inactive");
        sessionStartedRef.current = false;
      };

      rec.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          autoRestartRef.current = false;
          sessionStartedRef.current = false;
          setStatus("inactive");
          announceLiveRegion(voiceCopy.denied, { assertive: true });
          return;
        }
        if (event.error === "no-speech") {
          // Dalam mode suara langsung, diam saja dan terus menyimak.
          if (!autoRestartRef.current) {
            setStatus("inactive");
            sessionStartedRef.current = false;
            announceLiveRegion(voiceCopy.noSpeech, { assertive: true });
          }
          return;
        }
        if (!autoRestartRef.current) setStatus("inactive");
      };

      rec.onresult = (event) => {
        let interimText = "";
        let finalText = "";
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const chunk = result[0]?.transcript ?? "";
          if (result.isFinal) finalText += chunk;
          else interimText += chunk;
        }
        if (interimText) {
          setInterim(interimText);
          announceLiveRegion(voiceCopy.interim(interimText));
        }
        if (finalText) setFinalTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText));
      };
    },
    [voiceCopy],
  );

  useEffect(() => {
    bindRef.current = bind;
  }, [bind]);

  const start = useCallback(() => {
    if (!supported) return;
    setInterim("");
    setFinalTranscript("");
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    bind(rec);
    try {
      rec.start();
    } catch {
      setStatus("inactive");
    }
  }, [supported, bind]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      setStatus("processing");
    }
  }, []);

  /** Jeda mikrofon tanpa mematikan sesi (mis. saat web membalas dengan suara agar tidak menangkap gema sendiri). */
  const suspend = useCallback(() => {
    silentEndRef.current = true;
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }
    setStatus("inactive");
    setInterim("");
  }, []);

  return { supported, status, interim, finalTranscript, start, stop, suspend };
}