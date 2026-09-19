"use client";

import Link from "next/link";
import { Home, RefreshCw, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
      <WifiOff className="h-12 w-12 text-warning" aria-hidden="true" />
      <h1 className="text-h2 font-bold">Kamu sedang offline</h1>
      <p className="text-muted-foreground">
        Tunggu koneksi kembali, lalu muat ulang. Konten favorit dan data yang pernah dimuat tetap
        tersimpan di perangkatmu.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center gap-2 rounded-12 bg-primary px-5 text-base font-bold text-primary-foreground hover:bg-primary-hover"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Muat ulang
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-12 border-2 border-border bg-card px-5 text-base font-bold text-foreground hover:bg-muted"
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          Ke beranda
        </Link>
      </div>
    </div>
  );
}