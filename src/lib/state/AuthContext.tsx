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

async function parseApiResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const body = await parseApiResponse<{ ok: boolean; data: PublicUser }>(response);
      if (body?.data) setUser(body.data);
    } catch {
      setUser(null);
    }
  }, []);

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
      setError("Koneksi gagal. Pastikan server berjalan.");
      return false;
    }
  }, []);

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
      setError("Koneksi gagal. Pastikan server berjalan.");
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Keluar tetap berlaku di sisi klien meski server tidak dapat dijangkau.
    }
    setUser(null);
  }, []);

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