"use client";

import type { ReactNode } from "react";
import { AudioProvider } from "@/lib/audio/AudioManager";
import { AuthProvider } from "@/lib/state/AuthContext";
import { GamificationProvider } from "@/lib/state/GamificationContext";
import { ProfileProvider } from "@/lib/state/ProfileContext";
import { ReducedMotionProvider } from "@/lib/state/ReducedMotionProvider";
import { SettingsProvider } from "@/lib/state/SettingsContext";
import { SignLanguageProvider } from "@/lib/state/SignLanguageContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <ReducedMotionProvider>
        <ToastProvider>
          <AuthProvider>
            <AudioProvider>
              <ProfileProvider>
                <GamificationProvider>
                  <SignLanguageProvider>
                    <ServiceWorkerProvider />
                    {children}
                  </SignLanguageProvider>
                </GamificationProvider>
              </ProfileProvider>
            </AudioProvider>
          </AuthProvider>
        </ToastProvider>
      </ReducedMotionProvider>
    </SettingsProvider>
  );
}
