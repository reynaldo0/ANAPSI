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

export function useSpeechRecognition(voiceCopy: VoiceCopy = REPORT_VOICE_COPY) {
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [supported] = useState(() => createRecognition() !== null);
  const [status, setStatus] = useState<MicStatus>("inactive");
  const [interim, setInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      rec.stop();
      setStatus("processing");
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    setInterim("");
    setFinalTranscript("");
    const rec = createRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      setStatus("listening");
      announceLiveRegion(voiceCopy.listening);
    };
    rec.onend = () => {
      announceLiveRegion(voiceCopy.ended);
      setStatus("inactive");
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        announceLiveRegion(voiceCopy.denied, { assertive: true });
      } else if (event.error === "no-speech") {
        announceLiveRegion(voiceCopy.noSpeech, { assertive: true });
      }
      setStatus("inactive");
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

    announceLiveRegion(voiceCopy.listening);
    rec.start();
  }, [supported, voiceCopy]);

  return { supported, status, interim, finalTranscript, start, stop };
}