"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AudioPriority, type AudioRequest, type AudioStatus } from "@/types";
import { createUtterance, getSpeechSynthesis } from "@/lib/audio/tts";

interface AudioManagerValue {
  supported: boolean;
  enabled: boolean;
  status: AudioStatus;
  currentText: string | null;
  speak: (text: string, priority?: AudioPriority) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  repeat: () => void;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
}

const AudioContext = createContext<AudioManagerValue | null>(null);

const AUDIO_STORAGE_KEY = "blindspot:audio";

let requestSeq = 0;

function readStoredEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(AUDIO_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [supported] = useState(() => getSpeechSynthesis() !== null);
  const [enabled, setEnabledState] = useState(readStoredEnabled);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [currentText, setCurrentText] = useState<string | null>(null);

  const queueRef = useRef<AudioRequest[]>([]);
  const currentRef = useRef<AudioRequest | null>(null);
  const enabledRef = useRef(enabled);
  const pumpRef = useRef<() => void>(() => {});

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const synth = getSpeechSynthesis();
    const pump = () => {
      if (!synth) {
        currentRef.current = null;
        setStatus("unavailable");
        return;
      }
      if (currentRef.current) return;
      const next = queueRef.current.shift();
      if (!next) {
        setCurrentText(null);
        setStatus("idle");
        return;
      }
      const utterance = createUtterance(next.text);
      utterance.onstart = () => {
        currentRef.current = next;
        setCurrentText(next.text);
        setStatus("speaking");
      };
      utterance.onend = () => {
        currentRef.current = null;
        pumpRef.current();
      };
      utterance.onerror = () => {
        currentRef.current = null;
        pumpRef.current();
      };
      synth.speak(utterance);
    };
    pumpRef.current = pump;
    return () => {
      synth?.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string, priority: AudioPriority = AudioPriority.UserRequestedInformation) => {
      const synth = getSpeechSynthesis();
      if (!synth || !enabledRef.current) return;
      const current = currentRef.current;
      if (current && current.text === text) return;
      const request: AudioRequest = { id: String(++requestSeq), text, priority };

      if (current && priority < current.priority) {
        queueRef.current.unshift(request);
        synth.cancel();
        return;
      }
      queueRef.current.push(request);
      pumpRef.current();
    },
    [],
  );

  const pause = useCallback(() => {
    const synth = getSpeechSynthesis();
    if (!synth || !currentRef.current) return;
    synth.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const synth = getSpeechSynthesis();
    if (!synth || !currentRef.current) return;
    synth.resume();
    setStatus("speaking");
  }, []);

  const stop = useCallback(() => {
    const synth = getSpeechSynthesis();
    queueRef.current = [];
    currentRef.current = null;
    if (synth) synth.cancel();
    setCurrentText(null);
    setStatus("stopped");
  }, []);

  const repeat = useCallback(() => {
    const current = currentRef.current;
    if (current) {
      speak(current.text, current.priority);
    } else if (currentText) {
      speak(currentText);
    }
  }, [currentText, speak]);

  const setEnabled = useCallback(
    (value: boolean) => {
      enabledRef.current = value;
      setEnabledState(value);
      try {
        localStorage.setItem(AUDIO_STORAGE_KEY, String(value));
      } catch {
        // ignore
      }
      if (!value) stop();
    },
    [stop],
  );

  const toggleEnabled = useCallback(() => {
    setEnabled(!enabledRef.current);
  }, [setEnabled]);

  const value = useMemo<AudioManagerValue>(
    () => ({
      supported,
      enabled,
      status,
      currentText,
      speak,
      pause,
      resume,
      stop,
      repeat,
      setEnabled,
      toggleEnabled,
    }),
    [
      supported,
      enabled,
      status,
      currentText,
      speak,
      pause,
      resume,
      stop,
      repeat,
      setEnabled,
      toggleEnabled,
    ],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudioManager(): AudioManagerValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error("useAudioManager must be used within AudioProvider");
  }
  return ctx;
}
