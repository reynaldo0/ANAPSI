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

export interface SpeechRecognitionOptions {
  /** Secara otomatis membuat sesi baru saat sesi berakhir (hands-free). */
  autoRestart?: boolean;
  /**
   * Jeda senyap (ms) setelah user berhenti berbicara untuk dianggap "utarakan selesai".
   * 0 = nonaktif. Dipakai agar sistem langsung bereaksi tanpa menunggu final event,
   * sehingga AI tidak memotong dan tidak menunda jawaban.
   */
  endPointerMs?: number;
  /** Dipanggil saat user dianggap SELESAI bicara (satu utarapan utuh siap dikirim). */
  onUtterance?: (text: string) => void;
  /** Dipanggil segera saat user mulai bicara — host dapat mematikan TTS agar AI tidak menutupi user (barge-in). */
  onUserSpeaking?: () => void;
}

/**
 * Hook pengenal suara web (webkit SpeechRecognition) yang dirancang untuk
 * percakapan dua arah yang responsif:
 * - Barge-in: segera setelah user mulai bicara, onUserSpeaking dipanggil
 *   (host mematikan suara AI yang sedang membalas).
 * - Endpointer: setelah user berhenti bicara ~endPointerMs ms, onUtterance
 *   dipanggil dengan teks utarapan itu (AI menunggu user selesai, baru menjawab).
 * - Deduplikasi: utarapan yang sama hanya dilaporkan sekali.
 */
export function useSpeechRecognition(
  voiceCopy: VoiceCopy = REPORT_VOICE_COPY,
  options: SpeechRecognitionOptions = {},
) {
  const { autoRestart = false, endPointerMs = 0, onUtterance, onUserSpeaking } = options;
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported] = useState(() => createRecognition() !== null);
  const [status, setStatus] = useState<MicStatus>("inactive");
  const [interim, setInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");

  const autoRestartRef = useRef(autoRestart);
  const endPointerMsRef = useRef(endPointerMs);
  const onUtteranceRef = useRef(onUtterance);
  const onUserSpeakingRef = useRef(onUserSpeaking);
  const sessionStartedRef = useRef(false);
  const silentEndRef = useRef(false);

  // State yang dibaca dari callback SpeechRecognition.
  const interimRef = useRef("");
  const pendingFinalRef = useRef("");
  const lastSpeechMsRef = useRef(0);
  const firedRef = useRef("");
  const endTimerRef = useRef<number | null>(null);

  useEffect(() => {
    autoRestartRef.current = autoRestart;
  }, [autoRestart]);

  useEffect(() => {
    endPointerMsRef.current = endPointerMs;
  }, [endPointerMs]);

  useEffect(() => {
    onUtteranceRef.current = onUtterance;
  }, [onUtterance]);

  useEffect(() => {
    onUserSpeakingRef.current = onUserSpeaking;
  }, [onUserSpeaking]);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
      if (endTimerRef.current !== null) window.clearTimeout(endTimerRef.current);
    };
  }, []);

  const fireUtterance = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || firedRef.current === text) return;
    firedRef.current = text;
    interimRef.current = "";
    setStatus("processing");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(60);
      } catch {
        // ignore
      }
    }
    onUtteranceRef.current?.(text);
  }, []);

  const scheduleEndPointer = useCallback(() => {
    const ms = endPointerMsRef.current;
    if (ms <= 0) return;
    if (endTimerRef.current !== null) window.clearTimeout(endTimerRef.current);
    endTimerRef.current = window.setTimeout(() => {
      endTimerRef.current = null;
      if (Date.now() - lastSpeechMsRef.current < ms) return;
      const text = interimRef.current.trim();
      if (!text) return;
      fireUtterance(text);
    }, ms + 150);
  }, [fireUtterance]);

  const bindRef = useRef<(rec: SpeechRecognitionLike) => void>(() => {});
  const bind = useCallback(
    (rec: SpeechRecognitionLike) => {
      rec.lang = "id-ID";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        if (autoRestartRef.current && sessionStartedRef.current) {
          setStatus("listening");
          return;
        }
        sessionStartedRef.current = true;
        setStatus("listening");
        announceLiveRegion(voiceCopy.listening);
      };

      rec.onend = () => {
        if (endTimerRef.current !== null) {
          window.clearTimeout(endTimerRef.current);
          endTimerRef.current = null;
        }
        if (silentEndRef.current) {
          silentEndRef.current = false;
          setStatus("inactive");
          return;
        }
        // Saat sesi berhenti (manual/tidak sengaja) dan masih ada utarapan yang
        // belum dikirim, kirim dulu agar tidak ada pertanyaan user yang tertelan.
        const pending = interimRef.current.trim() || pendingFinalRef.current;
        if (pending) fireUtterance(pending);

        if (autoRestartRef.current) {
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
        let finalChunk = "";
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const chunk = result[0]?.transcript ?? "";
          if (result.isFinal) finalChunk += chunk;
          else interimText += chunk;
        }
        if (interimText) {
          // User mulai/terus bicara → beri tahu host supaya TTS dimatikan
          // (AI TIDAK boleh memotong). Lalu jadwalkan endpointer.
          interimRef.current = interimText;
          lastSpeechMsRef.current = Date.now();
          onUserSpeakingRef.current?.();
          setInterim(interimText);
          scheduleEndPointer();
          announceLiveRegion(voiceCopy.interim(interimText));
        }
        if (finalChunk) {
          pendingFinalRef.current = finalChunk.trim();
          setFinalTranscript((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk));
        }
      };
    },
    [voiceCopy, scheduleEndPointer, fireUtterance],
  );

  useEffect(() => {
    bindRef.current = bind;
  }, [bind]);

  const start = useCallback(() => {
    if (!supported) return;
    setInterim("");
    setFinalTranscript("");
    interimRef.current = "";
    pendingFinalRef.current = "";
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
    interimRef.current = "";
  }, []);

  return { supported, status, interim, finalTranscript, start, stop, suspend };
}