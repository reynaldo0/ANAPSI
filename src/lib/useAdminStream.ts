"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminLocation, AdminStats } from "@/types";

export interface AdminStreamSnapshot {
  stats: AdminStats;
  onlineUserNames: string[];
  recentLocations: Pick<AdminLocation, "id" | "displayName" | "lastPage" | "lastActivityAt">[];
  serverTime: string;
}

interface AdminStreamPayload {
  stats: AdminStats;
  onlineUserNames: string[];
  recentLocations: Pick<AdminLocation, "id" | "displayName" | "lastPage" | "lastActivityAt">[];
  serverTime: string;
}

export type AdminStreamStatus = "connecting" | "live" | "polling" | "error";

interface UseAdminStreamOptions {
  /** Interval fallback polling (dipakai saat EventSource tidak tersedia). */
  pollIntervalMs?: number;
}

function parseEvent(data: string | null): AdminStreamPayload | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as AdminStreamPayload;
  } catch {
    return null;
  }
}

/**
 * Sumber data realtime dashboard admin: Server-Sent Events dari
 * GET /api/admin/stream (snapshot setiap ~15 detik). Bila SSE gagal
 * terhubung (jaringan ketat/proxy), otomatis beralih ke polling reguler
 * agar dashboard tetap hidup.
 */
export function useAdminStream(
  onSnapshot: (snap: AdminStreamSnapshot) => void,
  options?: UseAdminStreamOptions,
): { status: AdminStreamStatus; error: string | null } {
  const pollIntervalMs = options?.pollIntervalMs ?? 30_000;
  const onSnapshotRef = useRef(onSnapshot);
  const onSnapshotCb = useCallback((snap: AdminStreamSnapshot) => onSnapshotRef.current(snap), []);

  const [status, setStatus] = useState<AdminStreamStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    let disposed = false;
    let es: EventSource | null = null;
    let hasSnapshot = false;

    const stopPolling = () => {
      if (pollingRef.current != null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    // Fallback bila ESE tidak jalan: query rangkuman via endpoint JSON.
    const startPolling = () => {
      stopPolling();
      setStatus("polling");
      const collect = async () => {
        if (disposed) return;
        try {
          const [statsRes, usersRes, locRes] = await Promise.all([
            fetch("/api/admin/stats", { cache: "no-store" }),
            fetch("/api/admin/users", { cache: "no-store" }),
            fetch("/api/admin/locations", { cache: "no-store" }),
          ]);
          const statsBody = await statsRes.json();
          const usersBody = await usersRes.json();
          const locBody = await locRes.json();
          if (disposed || !statsBody.ok) return;
          const users: { displayName: string; lastActivityAt: string | null }[] = usersBody.ok
            ? usersBody.data.users
            : [];
          const now = Date.now();
          const snapshot: AdminStreamSnapshot = {
            stats: statsBody.data as AdminStats,
            onlineUserNames: users
              .filter((u) => u.lastActivityAt && now - new Date(u.lastActivityAt).getTime() < 10 * 60_000)
              .map((u) => u.displayName),
            recentLocations: locBody.ok ? (locBody.data.locations ?? []).slice(0, 5) : [],
            serverTime: new Date().toISOString(),
          };
          hasSnapshot = true;
          onSnapshotCb(snapshot);
        } catch {
          setError("Real-time tidak tersedia — menampilkan data terakhir.");
        }
      };
      void collect();
      pollingRef.current = window.setInterval(() => void collect(), pollIntervalMs);
    };

    const startStream = () => {
      setStatus("connecting");
      try {
        es = new EventSource("/api/admin/stream");
      } catch {
        startPolling();
        return;
      }

      es.onopen = () => {
        if (!disposed) setStatus("live");
      };
      es.onmessage = (ev: MessageEvent) => {
        const payload = parseEvent(ev.data);
        if (!payload || disposed) return;
        hasSnapshot = true;
        onSnapshotCb({
          stats: payload.stats,
          onlineUserNames: payload.onlineUserNames,
          recentLocations: payload.recentLocations,
          serverTime: payload.serverTime,
        });
      };
      es.onerror = () => {
        if (es?.readyState === EventSource.CLOSED && !hasSnapshot && !disposed) {
          const trying = es;
          es = null;
          trying.close();
          startPolling();
        }
      };
    };

    startStream();

    return () => {
      disposed = true;
      stopPolling();
      es?.close();
    };
  }, [pollIntervalMs, onSnapshotCb]);

  return { status, error };
}