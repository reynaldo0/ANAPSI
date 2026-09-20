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
import { STORAGE_KEYS, type UserType } from "@/lib/constants";
import type { AccessibilityProfileType } from "@/types";

interface ProfileContextValue {
  activeProfile: AccessibilityProfileType | null;
  setActiveProfile: (profile: AccessibilityProfileType) => void;
  clearActiveProfile: () => void;
  /** Pilihan awal pengguna: nondisabilitas / tunanetra / tunadaksa. */
  userType: UserType | null;
  setUserType: (value: UserType) => void;
  /** true setelah nilai tersimpan dibaca dari localStorage (selesai hidrasi). */
  ready: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

type Snapshot = { profile: AccessibilityProfileType | null; userType: UserType | null; ready: boolean };
const EMPTY_SNAPSHOT: Snapshot = { profile: null, userType: null, ready: false };

let snapshot: Snapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Snapshot {
  return snapshot;
}

/** Saat SSR/hidrasi gunakan nilai default agar tidak terjadi hydration mismatch. */
function getServerSnapshot(): Snapshot {
  return EMPTY_SNAPSHOT;
}

function commit(next: Snapshot) {
  snapshot = next;
  for (const listener of Array.from(listeners)) listener();
}

/** Kunci lama (versi BlindSPOT). Dipindahkan ke kunci anapsi:* agar pilihan
 *  pengguna yang sudah ada tidak hilang setelah rename. */
const LEGACY_STORAGE_KEYS = {
  profile: "blindspot:profile",
  userType: "blindspot:userType",
} as const;

function readStoredProfile(): AccessibilityProfileType | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.profile);
    if (raw === "VISUAL_NAVIGATION" || raw === "WHEELCHAIR_MOBILITY") {
      return raw;
    }
    // NORMALISASI: "NON_DISABLED" tidak termasuk AccessibilityProfileType —
    // nilai lama akan membuat peta/lapisan salah (mis. semua jadi tunanetra).
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEYS.profile);
    if (legacy === "VISUAL_NAVIGATION" || legacy === "WHEELCHAIR_MOBILITY") {
      localStorage.setItem(STORAGE_KEYS.profile, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.profile);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

function readStoredUserType(): UserType | null {
  if (typeof window === "undefined") return null;
  try {
    const read = (key: string): UserType | null => {
      const raw = localStorage.getItem(key);
      return raw === "NON_DISABLED" || raw === "VISUAL_NAVIGATION" || raw === "WHEELCHAIR_MOBILITY"
        ? (raw as UserType)
        : null;
    };
    const stored = read(STORAGE_KEYS.userType);
    if (stored) return stored;
    // Migrasi kunci lama blindspot:* → anapsi:*
    const legacy = read(LEGACY_STORAGE_KEYS.userType);
    if (legacy) {
      localStorage.setItem(STORAGE_KEYS.userType, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEYS.userType);
      if (legacy === "NON_DISABLED") {
        localStorage.removeItem(STORAGE_KEYS.profile);
        localStorage.removeItem(LEGACY_STORAGE_KEYS.profile);
      }
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { profile, userType, ready } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Baca nilai tersimpan sekali setelah mount (client-only) lalu sinkronkan ke konsumen.
  useEffect(() => {
    commit({ profile: readStoredProfile(), userType: readStoredUserType(), ready: true });
  }, []);

  const setActiveProfile = useCallback((profile: AccessibilityProfileType) => {
    try {
      localStorage.setItem(STORAGE_KEYS.profile, profile);
    } catch {
      // ignore
    }
    commit({ profile, userType: snapshot.userType, ready: snapshot.ready });
  }, []);

  const clearActiveProfile = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.profile);
    } catch {
      // ignore
    }
    commit({ profile: null, userType: snapshot.userType, ready: snapshot.ready });
  }, []);

  const setUserType = useCallback(
    (value: UserType) => {
      try {
        localStorage.setItem(STORAGE_KEYS.userType, value);
        if (value === "NON_DISABLED") {
          localStorage.removeItem(STORAGE_KEYS.profile);
        } else {
          localStorage.setItem(STORAGE_KEYS.profile, value);
        }
      } catch {
        // ignore
      }
      commit({
        userType: value,
        profile: value === "NON_DISABLED" ? null : (value as AccessibilityProfileType),
        ready: snapshot.ready,
      });
    },
    [],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({ activeProfile: profile, setActiveProfile, clearActiveProfile, userType, setUserType, ready }),
    [profile, setActiveProfile, clearActiveProfile, userType, setUserType, ready],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useAccessibilityProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useAccessibilityProfile must be used within ProfileProvider");
  }
  return ctx;
}