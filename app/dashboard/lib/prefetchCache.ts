"use client";

/**
 * Cache sederhana untuk hasil prefetch API (TTL 30s).
 * Dipakai: Sidebar hover → isi cache; hook halaman (useMyKeanggotaan, dll.) baca cache dulu.
 */
const TTL_MS = 30_000;

const cache = new Map<string, { data: unknown; at: number }>();

export function setPrefetch(key: string, data: unknown): void {
  cache.set(key, { data, at: Date.now() });
}

export function getPrefetch<T = unknown>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/** URL → cache key (untuk getPrefetch di hook) */
export function urlToCacheKey(url: string): string {
  return url.replace("/api/", "").replace(/\//g, "-");
}

/** Route key → URL API yang akan diprefetch saat hover */
export const PREFETCH_APIS: Record<string, string[]> = {
  keanggotaan: ["/api/keanggotaan/profile", "/api/keanggotaan/riwayat"],
  ujian: ["/api/audit-ujian/ringkasan"],
};

export function prefetchForRoute(routeKey: string): void {
  const urls = PREFETCH_APIS[routeKey];
  if (!urls?.length) return;
  urls.forEach((url) => {
    const cacheKey = urlToCacheKey(url);
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data != null) setPrefetch(cacheKey, data);
      })
      .catch(() => {});
  });
}
