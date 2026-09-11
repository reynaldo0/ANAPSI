"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accessibility,
  Home,
  LogIn,
  LogOut,
  Map,
  Megaphone,
  Settings,
  Sparkles,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ACCESSIBILITY_PROFILES, APP_NAME, APP_TAGLINE, NAV_ITEMS } from "@/lib/constants";
import { useAccessibilityProfile } from "@/lib/state/ProfileContext";
import { useAuth } from "@/lib/state/AuthContext";
import { cn } from "@/lib/cn";

const SIDEBAR_ICONS: Record<string, LucideIcon> = {
  home: Home,
  map: Map,
  megaphone: Megaphone,
  users: Users,
  user: User,
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSidebar() {
const pathname = usePathname();
  const { activeProfile } = useAccessibilityProfile();
  const { user, loading, logout } = useAuth();
  const profileMeta = ACCESSIBILITY_PROFILES.find((p) => p.value === activeProfile);
  if (pathname === "/map") return null;
  return (
    <aside
      aria-label="Navigasi desktop"
      className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border/60 glass lg:flex"
    >
      <div className="flex h-full flex-col">
        <Link href="/" className="flex items-center gap-3 px-5 pb-4 pt-6">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-12 primary-solid text-primary-foreground shadow-card"
          >
            <Accessibility className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="label-uppercase block text-lg tracking-tight text-primary">{APP_NAME}</span>
            <span className="label-uppercase block text-[10px] text-muted-foreground">{APP_TAGLINE}</span>
          </span>
        </Link>

        <div className="px-5 pb-1">
          <p className="label-uppercase text-[11px] text-muted-foreground">Navigasi</p>
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {NAV_ITEMS.map((item, index) => {
            const active = isActive(pathname, item.href);
            const Icon = SIDEBAR_ICONS[item.icon] ?? Home;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-12 px-3 py-2.5 transition-colors",
                    active ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {active ? (
                    <span aria-hidden="true" className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-accent" />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-10 border border-border/60 bg-background/60 text-primary transition-colors group-hover:border-accent/50"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black tabular-nums text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="block truncate text-sm font-bold">{item.label}</span>
                  </span>
                  {active ? <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="space-y-2 border-t border-border/60 p-3">
          {profileMeta ? (
            <Link
              href="/onboarding"
              className="flex items-center gap-2 rounded-12 border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:border-accent/50"
            >
              <span aria-hidden="true" className="text-accent">
                <profileMeta.icon className="h-4 w-4" />
              </span>
              <span className="label-uppercase min-w-0 truncate">{profileMeta.label}</span>
            </Link>
          ) : null}

          <Link
            href="/chatbot"
            className="flex items-center justify-center gap-2 rounded-12 primary-solid px-3 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Obrolan AI
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-12 px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Pengaturan
          </Link>

          {loading ? null : user ? (
            <div className="flex items-center justify-between gap-2 rounded-12 border border-border/60 bg-background/60 px-3 py-2">
              <Link href="/profile" className="min-w-0 truncate text-sm font-bold hover:text-primary">
                {user.displayName}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Keluar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-10 border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-12 border border-border/60 px-3 py-2.5 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Masuk
              </Link>
              <Link
                href="/register"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-12 primary-solid px-3 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}