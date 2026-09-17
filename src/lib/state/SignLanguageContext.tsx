"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "blindspot:sign-language";

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
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(loadStored());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch {
      // storage unavailable — ignore
    }
  }, [enabled]);

  const value = useMemo<SignLanguageContextValue>(
    () => ({ enabled, setEnabled, toggle: () => setEnabled((v) => !v) }),
    [enabled],
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