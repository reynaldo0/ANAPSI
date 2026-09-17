"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Hydration-safe reader for browser-only values (mis. localStorage).
 * Mengembalikan `serverValue` saat SSR dan render klien pertama (hidrasi),
 * lalu nilai asli setelah mounted — mencegah hydration mismatch tanpa
 * memanggil setState di dalam effect.
 */
export function useStoredValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}
