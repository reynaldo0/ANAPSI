"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(readStoredSettings);

  useEffect(() => {
    applyToDocument(settings);
    try {
      localStorage.setItem(STORAGE_KEYS.appearance, JSON.stringify(settings));
    } catch {
      // storage may be unavailable; appearance still applied
    }
  }, [settings]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (settings.theme === "system") applyToDocument(settings);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  const setTheme = useCallback((theme: AppearanceTheme) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setSettings((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion }));
  }, []);

  const setTextSize = useCallback((ratio: number) => {
    setSettings((prev) => ({ ...prev, textSize: ratio }));
  }, []);

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
