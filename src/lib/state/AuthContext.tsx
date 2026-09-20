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
import type { PublicUser } from "@/types";

interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_CACHE_KEY = "anapsi:session-cache";

async function parseApiResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Baca cache session dari localStorage (null kalau tidak ada/corrupt). */
function readCachedUser(): PublicUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

/** Simpan user ke cache, atau hapus kalau null. */
function writeCachedUser(user: PublicUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // storage mungkin penuh — abaikan
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inisialisasi user dari cache dulu agar UI tidak flicker ke "belum login"
  const [user, setUserState] = useState<PublicUser | null>(() => readCachedUser());
  // loading=false kalau ada cache (sudah ada sesuatu untuk ditampilkan),
  // loading=true hanya kalau benar-benar belum ada data sama sekali.
  const [loading, setLoading] = useState<boolean>(() => readCachedUser() === null);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  // Wrapper setUser yang juga update cache
  const setUser = useCallback((u: PublicUser | null) => {
    writeCachedUser(u);
    setUserState(u);
  }, []);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        // 401 = session expired/tidak ada → hapus cache
        if (response.status === 401) setUser(null);
        // 5xx/network error → pertahankan cache yang ada (jangan logout paksa)
        return;
      }
      const body = await parseApiResponse<{ ok: boolean; data: PublicUser }>(response);
      if (body?.data) setUser(body.data);
    } catch {
      // Network error → pertahankan cache (user tetap "logged in" secara lokal)
      // jangan setUser(null) di sini
    } finally {
      refreshInFlight.current = false;
    }
  }, [setUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        if (cancelled) return;
        await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await parseApiResponse<{
        ok: boolean;
        data?: PublicUser;
        error?: { message?: string };
      }>(response);
      if (!response.ok) {
        setError(body?.error?.message ?? "Gagal masuk. Coba lagi.");
        return false;
      }
      if (body?.data) setUser(body.data);
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server. Pastikan backend Go dan MySQL sudah dijalankan.");
      return false;
    }
  }, [setUser]);

  const register = useCallback(async (input: RegisterInput): Promise<boolean> => {
    setError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await parseApiResponse<{
        ok: boolean;
        data?: PublicUser;
        error?: { message?: string };
      }>(response);
      if (!response.ok) {
        setError(body?.error?.message ?? "Pendaftaran gagal. Coba lagi.");
        return false;
      }
      if (body?.data) setUser(body.data);
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server. Pastikan backend Go dan MySQL sudah dijalankan.");
      return false;
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Keluar tetap berlaku di sisi klien meski server tidak dapat dijangkau.
    }
    setUser(null);
  }, [setUser]);

  const value = useMemo(
    () => ({ user, loading, error, clearError, refresh, login, register, logout }),
    [user, loading, error, clearError, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }
  return ctx;
}