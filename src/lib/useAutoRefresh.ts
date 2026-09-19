"use client";

import { useEffect, useRef } from "react";

/**
 * Penyegaran ringan untuk jaringan buruk: hanya berjalan saat tab terlihat,
 * tidak mengumumkan ke screen reader (penyegaran diam-diam), dan berhenti
 * sepenuhnya saat offline. Cocok untuk daftar laporan/komunitas yang ingin
 * tetap "realtime" tanpa beban.
 */
export function useAutoRefresh(fetcher: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    const run = () => {
      if (disposed) return;
      if (document.visibilityState === "visible" && navigator.onLine) {
        void fetcherRef.current();
      }
    };

    const id = window.setInterval(run, intervalMs);
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onFocusOrVisible);
    window.addEventListener("focus", onFocusOrVisible);

    return () => {
      disposed = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      window.removeEventListener("focus", onFocusOrVisible);
    };
  }, [intervalMs, enabled]);
}