"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HelpCircle, RefreshCw } from "lucide-react";
import { announceLiveRegion } from "@/lib/announcement";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    announceLiveRegion("Terjadi kesalahan saat memuat halaman.", { assertive: true });
  }, []);

  return (
    <div role="alert" className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
      <HelpCircle className="h-12 w-12 text-primary" aria-hidden="true" />
      <h1 className="text-h2 font-bold">Waduh, ada yang salah</h1>
      <p className="text-muted-foreground">
        Halaman tidak dapat dimuat. Ini kadang terjadi saat koneksi sedang buruk — coba muat ulang
        sekali lagi.
      </p>
      <p className="sr-only">{error.message}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center gap-2 rounded-12 bg-primary px-5 text-base font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Coba lagi
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-12 border-2 border-border bg-card px-5 text-base font-bold text-foreground hover:bg-muted"
        >
          Ke beranda
        </Link>
      </div>
    </div>
  );
}