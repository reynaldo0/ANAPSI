/* Service worker ANAPSI — pengalaman "jaringan buruk" yang tetap enak.
 *
 * Strategi:
 *  - Navigasi (HTML)      : network-first, fallback cache → /offline.
 *  - Aset Next (_next/*)  : cache-first (file ber-version hash,
 *                           immutable) — halaman berikutnya sangat cepat.
 *  - API publik (GET)     : stale-while-revalidate — langsung tampilkan data
 *                           terakhir, segarkan di latar belakang.
 *  - API pribadi/mutasi   : network-only (login, profil, admin, dsb).
 */

const VERSION = "anapsi-v1";
const STATIC_CACHE = `anapsi-static-${VERSION}`;
const DATA_CACHE = `anapsi-data-${VERSION}`;
const CORE = ["/", "/offline"];
const MAX_STATIC = 80;
const MAX_DATA = 60;

// Publik & cacheable: hanya data global non-pribadi.
function isPublicApi(pathname) {
  return (
    pathname.startsWith("/api/meta/") ||
    pathname.startsWith("/api/map/") ||
    pathname.startsWith("/api/geo/") ||
    pathname === "/api/places" ||
    pathname.startsWith("/api/places/") ||
    pathname === "/api/reports" ||
    pathname.startsWith("/api/reports/")
  );
}

async function prune(cache, max) {
  try {
    const keys = await cache.keys();
    if (keys.length <= max) return;
    await cache.delete(keys[0]);
    void prune(cache, max);
  } catch {
    /* ignore */
  }
}

async function putWithStamp(cache, req, res, max) {
  try {
    const headers = new Headers(res.headers);
    headers.set("x-anapsi-cached-at", String(Date.now()));
    const body = await res.blob();
    await cache.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers }));
    void prune(cache, max);
  } catch {
    /* ignore */
  }
}

async function serveStaticOrDynamic(req) {
  const staticCache = await caches.open(STATIC_CACHE);
  const hit = await staticCache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok && (req.url.includes("/_next/") || req.mode === "no-cors" && res.type === "opaque")) {
      await staticCache.put(req, res.clone());
      void prune(staticCache, MAX_STATIC);
    }
    return res;
  } catch {
    return new Response("", { status: 504 });
  }
}

async function staleWhileRevalidate(req, maxAgeMs) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(req);
  if (cached) {
    const cachedAt = Number(cached.headers.get("x-anapsi-cached-at") || 0);
    if (Date.now() - cachedAt < maxAgeMs) return cached;
    fetch(req)
      .then((res) => {
        if (res && res.ok) return putWithStamp(cache, req, res.clone(), MAX_DATA);
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      await putWithStamp(cache, req, res.clone(), MAX_DATA);
    }
    return res;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE))
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // jangan sentuh CDN/Overpass langsung

  // Navigasi dokumen: network-first, lalu cache halaman, terakhir /offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, res.clone());
            void prune(cache, MAX_STATIC);
          }
          return res;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await cache.match("/offline");
          if (offline) return offline;
          return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (isPublicApi(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, 120_000));
    }
    // API lain: biarkan lewat (network-only).
    return;
  }

  // Aset statis Next.js: cache-first.
  event.respondWith(serveStaticOrDynamic(request));
});