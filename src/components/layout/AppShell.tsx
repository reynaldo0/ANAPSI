import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppFooter } from "@/components/layout/Footer";
import { AppHeader } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";
import { AssertiveLiveRegion, LiveRegion } from "@/components/ui/LiveRegion";
import { FloatingChatbot } from "@/components/chatbot/FloatingChatbot";
import { GlobalVoiceCommander } from "@/components/voice/GlobalVoiceCommander";
import { FeatureTour } from "@/components/tutorial/FeatureTour";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <LiveRegion />
      <AssertiveLiveRegion />
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 focus:outline-none md:pb-12"
      >
        {children}
      </main>
      <AppFooter />
      <FloatingChatbot />
      <GlobalVoiceCommander />
      <BottomNav />
      <FeatureTour />
    </div>
  );
}
