"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
import { useAuth } from "@/lib/state/AuthContext";
import { useActivityHeartbeat } from "@/lib/useActivityHeartbeat";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { cn } from "@/lib/cn";

const FIRST_VISIT_BYPASS = new Set(["/onboarding", "/login", "/register", "/admin"]);

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

/** Bilah khas admin: hanya monitoring & laporan, tanpa navigasi aplikasi biasa. */
function AdminTopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-tight">Dashboard Admin</p>
            <p className="truncate text-xs text-muted-foreground">
              {user ? `Masuk sebagai ${user.displayName ?? user.email}` : "Monitor & moderasi anapsi"}
            </p>
          </div>
        </div>
        <nav aria-label="Navigasi admin (aksi)" className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-12 border-2 border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted"
          >
            Kembali ke aplikasi
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-10 items-center gap-1.5 rounded-12 border-2 border-border bg-card px-4 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-12 bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Masuk
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMapPage = pathname === "/map";
  const isAdminPage = pathname === "/admin" || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/login"));
  const online = useOnlineStatus();

  useActivityHeartbeat();

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
        <OfflineBanner online={online} />
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

  // Halaman admin: frame khusus admin — tanpa sidebar/header navigasi &
  // fitur pengguna (chatbot, tour, bottom nav). Fokus: monitoring + moderasi.
  if (isAdminPage) {
    return (
      <div className="flex min-h-screen flex-col">
        <SpeakOnNavigate />
        <SkipLink />
        <OfflineBanner online={online} />
        <LiveRegion />
        <AssertiveLiveRegion />
        <AdminTopBar />
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "mx-auto w-full flex-1 px-4 pt-6 focus:outline-none",
            "max-w-6xl pb-16",
          )}
        >
          {children}
        </main>
        <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          Dashboard Admin · anapsi.dev — akses terbatas untuk admin pengasuh.
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <FirstVisitGate />
      <SpeakOnNavigate />
      <SkipLink />
      <OfflineBanner online={online} />
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