"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/lib/state/AuthContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  if (pathname === "/map") return null;
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass lg:hidden">
      <nav aria-label="Navigasi utama" className="mx-auto flex h-[60px] w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${APP_NAME} — beranda`}>
          <BrandLogo size={36} withWordmark wordmarkClassName="text-[1.35rem]" />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("inline-flex items-center rounded-full px-3.5 py-2 text-sm font-bold transition-all", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  aria-label="Dashboard admin"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary hover:bg-primary-soft"
                >
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </Link>
              ) : null}
              <Link href="/profile" className="hidden max-w-32 truncate rounded-full bg-muted px-3 py-1.5 text-sm font-bold hover:bg-card sm:inline-block">{user.displayName}</Link>
              <button type="button" onClick={() => void logout()} className="rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm font-bold hover:bg-muted">Keluar</button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-muted">Masuk</Link>
              <Link href="/register" className="rounded-full primary-solid px-4 py-1.5 text-sm font-black text-primary-foreground">Daftar</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
