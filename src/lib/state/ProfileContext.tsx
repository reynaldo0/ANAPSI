"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { STORAGE_KEYS, type UserType } from "@/lib/constants";
import type { AccessibilityProfileType } from "@/types";

interface ProfileContextValue {
  activeProfile: AccessibilityProfileType | null;
  setActiveProfile: (profile: AccessibilityProfileType) => void;
  clearActiveProfile: () => void;
  /** Pilihan awal pengguna: nondisabilitas / tunanetra / tunadaksa. */
  userType: UserType | null;
  setUserType: (value: UserType) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readStoredProfile(): AccessibilityProfileType | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.profile) as AccessibilityProfileType | null;
  } catch {
    return null;
  }
}

function readStoredUserType(): UserType | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.userType);
    return raw === "NON_DISABLED" || raw === "VISUAL_NAVIGATION" || raw === "WHEELCHAIR_MOBILITY"
      ? (raw as UserType)
      : null;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfileState] = useState<AccessibilityProfileType | null>(
    readStoredProfile,
  );
  const [userType, setUserTypeState] = useState<UserType | null>(readStoredUserType);

  const setActiveProfile = useCallback((profile: AccessibilityProfileType) => {
    setActiveProfileState(profile);
    try {
      localStorage.setItem(STORAGE_KEYS.profile, profile);
    } catch {
      // ignore
    }
  }, []);

  const clearActiveProfile = useCallback(() => {
    setActiveProfileState(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.profile);
    } catch {
      // ignore
    }
  }, []);

  const setUserType = useCallback(
    (value: UserType) => {
      setUserTypeState(value);
      try {
        localStorage.setItem(STORAGE_KEYS.userType, value);
      } catch {
        // ignore
      }
      if (value === "NON_DISABLED") {
        clearActiveProfile();
      } else {
        setActiveProfile(value as AccessibilityProfileType);
      }
    },
    [clearActiveProfile, setActiveProfile],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({ activeProfile, setActiveProfile, clearActiveProfile, userType, setUserType }),
    [activeProfile, setActiveProfile, clearActiveProfile, userType, setUserType],
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