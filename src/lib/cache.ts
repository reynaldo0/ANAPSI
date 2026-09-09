/**
 * Caching strategy dasar untuk data API (mendekati stale-while-revalidate).
 * Digunakan untuk GET yang jarang berubah; mutasi tidak pernah di-cache.
 */

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export interface CacheOptions {
  ttlMs?: number;
  signal?: AbortSignal;
}

export async function fetchJsonWithCache<T>(
  url: string,
  init?: RequestInit & CacheOptions,
): Promise<T> {
  const ttlMs = init?.ttlMs ?? 0;
  const entry = cache.get(url) as CacheEntry<T> | undefined;

  if (entry && (ttlMs <= 0 || Date.now() - entry.fetchedAt < ttlMs)) {
    return entry.data;
  }

  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Fetch gagal: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as T;
  cache.set(url, { data, fetchedAt: Date.now() });
  return data;
}

export function clearCache(): void {
  cache.clear();
}