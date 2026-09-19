"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/state/AuthContext";

const SHARE_FLAG = "bs_share_location";

/**
 * Mengirim heartbeat aktivitas dari pengguna yang masuk ke backend Go. Lokasi
 * ikut dikirim hanya bila pengguna menyetujui (flag lokal + konsen di server
 * enforced oleh backend). Dipakai dashboard admin untuk memantau lokasi dan
 * aktivitas terakhir pengguna disabilitas secara realtime.
 */
export function useActivityHeartbeat(intervalMs = 45_000) {
  const { user } = useAuth();
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  // Simpan jalur terbaru di luar render (rule: jangan akses ref saat render).
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const userKey = user?.id ?? null;
  const shareRef = useRef(true);

  useEffect(() => {
    shareRef.current = localStorage.getItem(SHARE_FLAG) !== "0";
  }, [userKey]);

  useEffect(() => {
    if (!userKey) return;
    let cancelled = false;
    let lat: number | null = null;
    let lng: number | null = null;

    const send = async () => {
      if (cancelled) return;
      const page = pathRef.current;
      try {
        const body: Record<string, unknown> = { page };
        if (shareRef.current && lat != null && lng != null) {
          body.lat = lat;
          body.lng = lng;
        }
        const res = await fetch("/api/activity/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: { activityEnabled?: boolean } };
          if (typeof json.data?.activityEnabled === "boolean") {
            shareRef.current = json.data.activityEnabled;
            localStorage.setItem(SHARE_FLAG, json.data.activityEnabled ? "1" : "0");
          }
        }
      } catch {
        // Heartbeat best-effort; jangan ganggu UX.
      }
    };

    // Kirim segera saat halaman berubah, lalu berkala.
    void send();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        },
        () => {},
        { timeout: 6000, maximumAge: 5 * 60_000 },
      );
    }
    const id = window.setInterval(() => void send(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [userKey, intervalMs]);
}

export { SHARE_FLAG };