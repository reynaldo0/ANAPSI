"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export function AppFooter() {
  const pathname = usePathname();
  if (pathname === "/map") return null;
  return (
    <footer className="border-t-2 border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <p className="text-lg font-black tracking-tight text-primary">{APP_NAME}</p>
        <p className="text-muted-foreground">{APP_TAGLINE}</p>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Data aksesibilitas berasal dari laporan komunitas dan tidak menjamin kondisi aktual di
          lokasi. Selalu utamakan keselamatanmu.
        </p>
        <nav aria-label="Navigasi footer" className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/map" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Peta Aksesibilitas
          </Link>
          <Link
            href="/community"
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Komunitas
          </Link>
          <Link
            href="/profile"
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Profil
          </Link>
        </nav>
      </div>
    </footer>
  );
}
