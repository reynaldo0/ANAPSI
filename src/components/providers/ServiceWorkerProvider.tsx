"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker /sw.js hanya pada build produksi. Service worker
 * membuat pengalaman "pelan internet" menjadi jauh lebih enak: halaman yang
 * pernah dibuka tetap bisa dipakai saat offline, dan data publik (peta,
 * tempat, laporan) disajikan seketika dari memori sambil disegarkan di latar.
 */
export function ServiceWorkerProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.location.protocol.startsWith("http")) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Offline demo/dll: jangan ganggu.
      });
  }, []);

  return null;
}