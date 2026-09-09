"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GamificationStats } from "@/types";

const REPORTER_KEY = "blindspot:reporter";
const GAMIFICATION_KEY = "blindspot:gamification";

export interface LocalGamificationState {
  reporterId: string;
  reports: number;
  verifiedReports: number;
  points: number;
  badges: string[];
  lastEarned: string[];
}

interface GamificationContextValue {
  reporterId: string;
  state: LocalGamificationState;
  /** Gabungkan hasil server (poin + badge baru) ke penyimpanan lokal. */
  applyServerResult: (result: GamificationStats) => LocalGamificationState;
  /** Sinkronkan snapshot penuh (mis. hasil verify badge). */
  sync: (result: GamificationStats) => void;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

function generateReporterId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `rep-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function readReporterId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(REPORTER_KEY);
    if (existing) return existing;
    const fresh = generateReporterId();
    localStorage.setItem(REPORTER_KEY, fresh);
    return fresh;
  } catch {
    return generateReporterId();
  }
}

function readState(): LocalGamificationState {
  if (typeof window === "undefined") {
    return { reporterId: "", reports: 0, verifiedReports: 0, points: 0, badges: [], lastEarned: [] };
  }
  const reporterId = readReporterId();
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalGamificationState>;
      return {
        reporterId: parsed.reporterId ?? reporterId,
        reports: parsed.reports ?? 0,
        verifiedReports: parsed.verifiedReports ?? 0,
        points: parsed.points ?? 0,
        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
        lastEarned: Array.isArray(parsed.lastEarned) ? parsed.lastEarned : [],
      };
    }
  } catch {
    // ignore
  }
  return { reporterId, reports: 0, verifiedReports: 0, points: 0, badges: [], lastEarned: [] };
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [reporterId] = useState(readReporterId);
  const [state, setState] = useState<LocalGamificationState>(readState);

  const persist = useCallback((next: LocalGamificationState) => {
    setState(next);
    try {
      localStorage.setItem(
        GAMIFICATION_KEY,
        JSON.stringify({
          reporterId: next.reporterId,
          reports: next.reports,
          verifiedReports: next.verifiedReports,
          points: next.points,
          badges: next.badges,
        }),
      );
    } catch {
      // ignore
    }
  }, []);

  const applyServerResult = useCallback(
    (result: GamificationStats) => {
      const next: LocalGamificationState = {
        reporterId: result.reporterId || reporterId,
        reports: result.reports,
        verifiedReports: result.verifiedReports,
        points: result.points,
        badges: result.badges,
        lastEarned: result.newlyEarned,
      };
      persist(next);
      return next;
    },
    [persist, reporterId],
  );

  const sync = useCallback(
    (result: GamificationStats) => {
      const next = applyServerResult(result);
      setState((prev) => ({ ...next, lastEarned: prev.lastEarned.length ? prev.lastEarned : next.lastEarned }));
    },
    [applyServerResult],
  );

  const value = useMemo<GamificationContextValue>(
    () => ({ reporterId, state, applyServerResult, sync }),
    [reporterId, state, applyServerResult, sync],
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error("useGamification must be used within GamificationProvider");
  }
  return ctx;
}