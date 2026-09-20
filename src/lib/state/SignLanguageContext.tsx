"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useStoredValue } from "@/lib/state/useStoredValue";

const STORAGE_KEY = "anapsi:sign-language";

interface SignLanguageContextValue {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
}

const SignLanguageContext = createContext<SignLanguageContextValue | null>(null);

function loadStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function SignLanguageProvider({ children }: { children: ReactNode }) {
  const stored = useStoredValue(loadStored, false);
  const [override, setOverride] = useState<boolean | null>(null);
  const enabled = override ?? stored;

  const setEnabled = useCallback((value: boolean) => {
    setOverride(value);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch {
      // storage unavailable — ignore
    }
  }, [enabled]);

  const value = useMemo<SignLanguageContextValue>(
    () => ({ enabled, setEnabled, toggle: () => setEnabled(!enabled) }),
    [enabled, setEnabled],
  );

  return <SignLanguageContext.Provider value={value}>{children}</SignLanguageContext.Provider>;
}

export function useSignLanguage(): SignLanguageContextValue {
  const ctx = useContext(SignLanguageContext);
  if (!ctx) {
    throw new Error("useSignLanguage must be used within a SignLanguageProvider");
  }
  return ctx;
}