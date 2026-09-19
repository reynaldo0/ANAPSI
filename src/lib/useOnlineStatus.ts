"use client";

import { useEffect, useState } from "react";

/**
 * Mengikuti status koneksi perangkat (online/offline). Dipakai untuk banner
 * OfflineBanner dan untuk menghentikan polling yang tidak perlu saat offline.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}