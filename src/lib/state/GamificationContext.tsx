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

const EMPTY_STATE: LocalGamificationState = {
  reporterId: "",
  reports: 0,
  verifiedReports: 0,
  points: 0,
  badges: [],
  lastEarned: [],
};

let gamSnapshot: LocalGamificationState = EMPTY_STATE;
const gamListeners = new Set<() => void>();

function subscribeGam(listener: () => void): () => void {
  gamListeners.add(listener);
  return () => {
    gamListeners.delete(listener);
  };
}

function getGamSnapshot(): LocalGamificationState {
  return gamSnapshot;
}

/** Saat SSR/hidrasi gunakan nilai default agar tidak terjadi hydration mismatch. */
function getServerGamSnapshot(): LocalGamificationState {
  return EMPTY_STATE;
}

function commitGam(next: LocalGamificationState): void {
  gamSnapshot = next;
  for (const listener of Array.from(gamListeners)) listener();
}

function readStoredState(): LocalGamificationState {
  if (typeof window === "undefined") return EMPTY_STATE;
  const reporterId = readReporterId();
  return { ...readState(), reporterId };
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribeGam, getGamSnapshot, getServerGamSnapshot);

  useEffect(() => {
    commitGam(readStoredState());
  }, []);

  const persist = useCallback((next: LocalGamificationState) => {
    commitGam(next);
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
        reporterId: result.reporterId || getGamSnapshot().reporterId,
        reports: result.reports,
        verifiedReports: result.verifiedReports,
        points: result.points,
        badges: result.badges,
        lastEarned: result.newlyEarned,
      };
      persist(next);
      return next;
    },
    [persist],
  );

  const sync = useCallback(
    (result: GamificationStats) => {
      const next = applyServerResult(result);
      commitGam({
        ...next,
        lastEarned: getGamSnapshot().lastEarned.length ? getGamSnapshot().lastEarned : next.lastEarned,
      });
    },
    [applyServerResult],
  );

  const value = useMemo<GamificationContextValue>(
    () => ({ reporterId: state.reporterId, state, applyServerResult, sync }),
    [state, applyServerResult, sync],
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