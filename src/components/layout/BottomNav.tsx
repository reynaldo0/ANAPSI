"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  Megaphone,
  Users,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Tombol aksi utama ditampilkan lebih menonjol */
  primary?: boolean;
}

const BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/map", label: "Peta", Icon: Map },
  { href: "/report", label: "Lapor", Icon: Megaphone, primary: true },
  { href: "/community", label: "Komunitas", Icon: Users },
  { href: "/profile", label: "Profil", Icon: User },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/map") return null;

  return (
    <nav
      aria-label="Navigasi utama (ponsel)"
      data-tour="bottomnav"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        // Glass-morphism effect
        "border-t border-border/60 glass",
        // Safe-area for devices with home indicator
        "pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      <ul
        className="mx-auto flex w-full max-w-lg items-end justify-around px-1"
        role="list"
      >
        {BOTTOM_NAV.map((item) => {
          const active = isActive(pathname, item.href);

          if (item.primary) {
            // Centre FAB-style Report button
            return (
              <li key={item.href} className="flex flex-1 justify-center" role="listitem">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={`${item.label}${active ? " (halaman aktif)" : ""}`}
                  className={cn(
                    // Elevated pill button — stands above the nav bar
                    "-translate-y-3 flex h-14 w-14 flex-col items-center justify-center rounded-full shadow-float",
                    "transition-all duration-150 active:scale-90",
                    active
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-primary text-primary-foreground hover:bg-primary-hover",
                  )}
                >
                  <item.Icon className="h-6 w-6" aria-hidden="true" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href} className="flex flex-1 justify-center" role="listitem">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={`${item.label}${active ? " (halaman aktif)" : ""}`}
                className={cn(
                  "group relative flex min-w-[56px] flex-col items-center gap-0.5 px-2 py-2.5",
                  "text-[11px] font-medium transition-colors duration-150",
                  "active:scale-95",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Active indicator pill */}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary transition-all duration-200"
                  />
                ) : null}

                {/* Icon with subtle bg on active */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150",
                    active
                      ? "bg-primary-soft scale-110"
                      : "group-hover:bg-muted",
                  )}
                >
                  <item.Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-150",
                      active ? "scale-110" : "group-hover:scale-105",
                    )}
                  />
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "transition-all duration-150",
                    active ? "font-semibold" : "",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
