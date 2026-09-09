"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface ReducedMotionContextValue {
  prefersReducedMotion: boolean;
}

const ReducedMotionContext = createContext<ReducedMotionContextValue | null>(null);

export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.documentElement.setAttribute(
      "data-reduced-motion",
      mq.matches ? "true" : "false",
    );
    const onChange = () => {
      setPrefersReducedMotion(mq.matches);
      document.documentElement.setAttribute("data-reduced-motion", mq.matches ? "true" : "false");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <ReducedMotionContext.Provider value={{ prefersReducedMotion }}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion(): ReducedMotionContextValue {
  const ctx = useContext(ReducedMotionContext);
  if (!ctx) {
    throw new Error("useReducedMotion must be used within ReducedMotionProvider");
  }
  return ctx;
}