/**
 * Convert a remote (or data:) URL to a File object suitable for upload to
 * NB2/Seedream/Grok. Includes an in-memory LRU cache so repeated generations
 * with the same character / gallery item don't re-download the bytes.
 *
 *   - blob: / data: URIs skip the cache (already local, cheap to convert)
 *   - HTTP(S) URLs are cached up to MAX_ENTRIES, oldest-access evicted first
 *   - Files > MAX_FILE_SIZE are NOT cached (avoid memory bloat)
 *   - Cache is module-scoped (survives navigation, dies on full page reload)
 *   - Different filenames for the same URL share the underlying bytes —
 *     only the File wrapper is new
 */

interface CacheEntry {
  file: File;
  size: number;
  lastAccess: number;
}

const cache = new Map<string, CacheEntry>();
const MAX_ENTRIES = 30;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB per file

export async function urlToFile(url: string, filename = 'character.png'): Promise<File> {
  // Ephemeral local URIs — fetch is free, no point caching
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'image/png' });
  }

  const cached = cache.get(url);
  if (cached) {
    cached.lastAccess = Date.now();
    // Same filename? return the same File. Different? wrap with new name —
    // the underlying Blob bytes are shared, no duplication.
    return cached.file.name === filename
      ? cached.file
      : new File([cached.file], filename, { type: cached.file.type });
  }

  // Miss — fetch, wrap, optionally cache
  const res = await fetch(url);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type || 'image/png' });

  if (blob.size <= MAX_FILE_SIZE) {
    cache.set(url, { file, size: blob.size, lastAccess: Date.now() });
    // LRU eviction (linear scan; cache is small, fine)
    if (cache.size > MAX_ENTRIES) {
      let oldestKey: string | null = null;
      let oldestTs = Infinity;
      for (const [k, v] of cache) {
        if (v.lastAccess < oldestTs) {
          oldestTs = v.lastAccess;
          oldestKey = k;
        }
      }
      if (oldestKey) cache.delete(oldestKey);
    }
  }

  return file;
}

/** Drop everything from the cache. Call on sign-out or test teardown. */
export function clearUrlToFileCache(): void {
  cache.clear();
}

/** Inspect cache size for debugging / telemetry. */
export function urlToFileCacheStats(): { entries: number; totalBytes: number } {
  let totalBytes = 0;
  for (const e of cache.values()) totalBytes += e.size;
  return { entries: cache.size, totalBytes };
}

/** Drop a specific URL from the cache (e.g. after deletion or replacement). */
export function invalidateUrlToFileCache(url: string): void {
  cache.delete(url);
}
