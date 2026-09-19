"use client";

import { useEffect, useRef } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { announceLiveRegion } from "@/lib/announcement";

/**
 * Banner non-mengganggu untuk kondisi offline / jaringan buruk. Saat koneksi
 * kembali, dialog mengajak memuat ulang data sehingga konten tetap segar.
 */
export function OfflineBanner({ online }: { online: boolean }) {
  const announced = useRef<boolean | null>(null);

  useEffect(() => {
    if (announced.current === online) return;
    announced.current = online;
    if (online) {
      announceLiveRegion("Koneksi kembali. Data akan disegarkan otomatis.", { assertive: true });
    } else {
      announceLiveRegion("Tidak ada koneksi internet. Data terakhir yang dimuat tetap bisa dipakai.", { assertive: true });
    }
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] border-b-2 border-warning bg-warning-soft px-4 py-3 shadow-card"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-warning">
          <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
          Kamu sedang offline. Data yang terakhir dimuat tetap bisa dipakai.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center gap-2 rounded-12 border-2 border-warning bg-background px-4 py-2 text-sm font-bold text-warning hover:bg-warning/10"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Muat ulang
        </button>
      </div>
    </div>
  );
}