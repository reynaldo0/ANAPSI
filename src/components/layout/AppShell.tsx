"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { AppFooter } from "@/components/layout/Footer";
import { AppHeader } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";
import { AssertiveLiveRegion, LiveRegion } from "@/components/ui/LiveRegion";
import { FloatingChatbot } from "@/components/chatbot/FloatingChatbot";
import { GlobalVoiceCommander } from "@/components/voice/GlobalVoiceCommander";
import { SpeakOnNavigate } from "@/components/voice/SpeakOnNavigate";
import { FeatureTour } from "@/components/tutorial/FeatureTour";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { cn } from "@/lib/cn";

const FIRST_VISIT_BYPASS = new Set(["/onboarding", "/login", "/register"]);

/** Pengguna baru diarahkan memilih "Kamu siapa?" sebelum masuk ke halaman lain. */
function FirstVisitGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { userType, ready } = useAccessibilityProfile();

  useEffect(() => {
    if (!ready) return;
    if (userType !== null) return;
    if (FIRST_VISIT_BYPASS.has(pathname)) return;
    router.replace("/onboarding");
  }, [ready, userType, pathname, router]);

  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === "/map";

  useEffect(() => {
    if (!isMapPage) return;
    const previousOverflow = document.body.style.overflow;
    const previousHeight = document.body.style.height;
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.height = previousHeight;
    };
  }, [isMapPage]);

  // Laman peta menggunakan layar penuh tanpa bingkai/tata letak lain:
  // benar-benar 100% viewport, tidak scrollable, peta selalu jadi fokus.
  if (isMapPage) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        <FirstVisitGate />
        <SpeakOnNavigate />
        <SkipLink />
        <LiveRegion />
        <AssertiveLiveRegion />
        <main id="main-content" tabIndex={-1} className="h-full w-full focus:outline-none">
          {children}
        </main>
        <GlobalVoiceCommander />
        <FeatureTour />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <FirstVisitGate />
      <SpeakOnNavigate />
      <SkipLink />
      <LiveRegion />
      <AssertiveLiveRegion />
      <DesktopSidebar />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <AppHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "mx-auto w-full flex-1 px-4 pt-6 focus:outline-none",
            "max-w-6xl pb-32 md:pb-12 lg:pb-16",
          )}
        >
          {children}
        </main>
        <AppFooter />
      </div>
      <FloatingChatbot />
      <GlobalVoiceCommander />
      <BottomNav />
      <FeatureTour />
    </div>
  );
}