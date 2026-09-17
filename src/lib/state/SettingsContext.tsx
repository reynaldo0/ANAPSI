"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/lib/constants";
import { DEFAULT_APPEARANCE, type AppearanceSettings, type AppearanceTheme } from "@/types";

interface SettingsContextValue {
  settings: AppearanceSettings;
  setTheme: (theme: AppearanceTheme) => void;
  toggleHighContrast: () => void;
  toggleReduceMotion: () => void;
  setTextSize: (ratio: number) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStoredSettings(): AppearanceSettings {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.appearance);
    return raw
      ? { ...DEFAULT_APPEARANCE, ...(JSON.parse(raw) as Partial<AppearanceSettings>) }
      : DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function resolveTheme(theme: AppearanceTheme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyToDocument(settings: AppearanceSettings): void {
  const root = document.documentElement;
  const resolved = resolveTheme(settings.theme);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
  root.style.fontSize = `${(settings.textSize ?? 1) * 16}px`;
  if (settings.highContrast) {
    root.setAttribute("data-high-contrast", "true");
  } else {
    root.removeAttribute("data-high-contrast");
  }
}

let snapshot: AppearanceSettings = DEFAULT_APPEARANCE;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppearanceSettings {
  return snapshot;
}

/** Saat SSR/hidrasi gunakan nilai default agar tidak terjadi hydration mismatch. */
function getServerSnapshot(): AppearanceSettings {
  return DEFAULT_APPEARANCE;
}

function commit(next: AppearanceSettings): void {
  snapshot = next;
  for (const listener of Array.from(listeners)) listener();
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const stored = readStoredSettings();
    commit(stored);
    applyToDocument(stored);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getSnapshot().theme === "system") applyToDocument(getSnapshot());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const commitWithSideEffects = useCallback((next: AppearanceSettings) => {
    applyToDocument(next);
    try {
      localStorage.setItem(STORAGE_KEYS.appearance, JSON.stringify(next));
    } catch {
      // storage may be unavailable; appearance still applied
    }
    commit(next);
  }, []);

  const setTheme = useCallback(
    (theme: AppearanceTheme) => {
      commitWithSideEffects({ ...getSnapshot(), theme });
    },
    [commitWithSideEffects],
  );

  const toggleHighContrast = useCallback(() => {
    commitWithSideEffects({ ...getSnapshot(), highContrast: !getSnapshot().highContrast });
  }, [commitWithSideEffects]);

  const toggleReduceMotion = useCallback(() => {
    commitWithSideEffects({ ...getSnapshot(), reduceMotion: !getSnapshot().reduceMotion });
  }, [commitWithSideEffects]);

  const setTextSize = useCallback(
    (ratio: number) => {
      commitWithSideEffects({ ...getSnapshot(), textSize: ratio });
    },
    [commitWithSideEffects],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setTheme, toggleHighContrast, toggleReduceMotion, setTextSize }),
    [settings, setTheme, toggleHighContrast, toggleReduceMotion, setTextSize],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppearanceSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useAppearanceSettings must be used within SettingsProvider");
  }
  return ctx;
}
