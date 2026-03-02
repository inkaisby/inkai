const CACHE_KEY_PREFIX = "wilayah:";

/** Cache in-memory (cepat) + localStorage (tetap setelah refresh). Online hanya saat refresh. */
const memoryCache = new Map<string, unknown[]>();
const storageAvailable =
  typeof localStorage !== "undefined" && typeof JSON.parse === "function";

function getCached<T = unknown>(key: string): T[] | null {
  const mem = memoryCache.get(key);
  if (mem != null && Array.isArray(mem)) return mem as T[];
  if (storageAvailable) {
    try {
      const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          memoryCache.set(key, parsed);
          return parsed as T[];
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function setCache(key: string, data: unknown[]) {
  memoryCache.set(key, data);
  if (storageAvailable) {
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(data));
    } catch {
      // ignore quota / private
    }
  }
}

/** Hapus cache (untuk paksa ambil data terbaru dari server). */
export function invalidateWilayahCache(urlKey?: string) {
  if (urlKey) {
    memoryCache.delete(urlKey);
    if (storageAvailable) localStorage.removeItem(CACHE_KEY_PREFIX + urlKey);
  } else {
    memoryCache.clear();
    if (storageAvailable) {
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith(CACHE_KEY_PREFIX)) keys.push(k);
        }
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  }
}

type FetchOptions = {
  signal?: AbortSignal;
  /** true = bypass cache, ambil dari API (untuk update). */
  refresh?: boolean;
/* ===============================
   SAFE FETCH (UI FRIENDLY)
================================ */
};

function getWilayahUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path;
}

async function safeFetch<T = unknown>(
  url: string,
  options?: FetchOptions
): Promise<T[]> {
  const cacheKey = url;
  if (!options?.refresh) {
    const cached = getCached<T>(cacheKey);
    if (cached != null) return cached;
  }

  const fetchUrl = getWilayahUrl(url);

  async function doFetch(): Promise<T[]> {
    const res = await fetch(fetchUrl, {
      cache: "no-store",
      signal: options?.signal,
    });

    if (!res.ok) {
      console.warn("Wilayah fetch failed:", url, res.status);
      return [];
    }

    const json = await res.json();
    const arr = Array.isArray(json) ? json : [];
    if (arr.length > 0) setCache(cacheKey, arr);
    return arr as T[];
  }

  try {
    return await doFetch();
  } catch (err: unknown) {
    const name = err && typeof err === "object" && "name" in err ? (err as { name: string }).name : undefined;
    if (name === "AbortError") return [];
    console.error("Wilayah fetch error:", fetchUrl, err);
    const stale = getCached<T>(cacheKey);
    return stale ?? [];
  }
}

/* ===============================
   PUBLIC API — lokal dulu (cache), online hanya jika refresh
================================ */
export const getProvinces = (signal?: AbortSignal, opts?: { refresh?: boolean }) =>
  safeFetch("/api/wilayah/provinces", { signal, refresh: opts?.refresh });

export const getRegencies = (
  provinceId: string,
  signal?: AbortSignal,
  opts?: { refresh?: boolean }
) =>
  provinceId
    ? safeFetch(`/api/wilayah/regencies?provinceId=${provinceId}`, {
        signal,
        refresh: opts?.refresh,
      })
    : Promise.resolve([]);

export const getDistricts = (
  regencyId: string,
  signal?: AbortSignal,
  opts?: { refresh?: boolean }
) =>
  regencyId
    ? safeFetch(`/api/wilayah/districts?regencyId=${regencyId}`, {
        signal,
        refresh: opts?.refresh,
      })
    : Promise.resolve([]);

export const getVillages = (
  districtId: string,
  signal?: AbortSignal,
  opts?: { refresh?: boolean }
) =>
  districtId
    ? safeFetch(`/api/wilayah/villages?districtId=${districtId}`, {
        signal,
        refresh: opts?.refresh,
      })
    : Promise.resolve([]);
