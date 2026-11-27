/**
 * Shared Stale-While-Revalidate (SWR) in-memory cache for frontend list and summary data.
 * Automatically clears when mutations occur via apiFetch or on manual Refresh.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const store = new Map<string, CacheEntry<any>>()
const DEFAULT_TTL_MS = 60_000

export function getCacheEntry<T>(key: string, maxAgeMs = DEFAULT_TTL_MS): CacheEntry<T> | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > maxAgeMs) {
    store.delete(key)
    return null
  }
  return entry as CacheEntry<T>
}

export function getCachedData<T>(key: string, maxAgeMs = DEFAULT_TTL_MS): T | null {
  return getCacheEntry<T>(key, maxAgeMs)?.data ?? null
}

export function setCachedData<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear()
    return
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
    }
  }
}

const mutationListeners = new Set<() => void>()

export function onDataMutation(listener: () => void): () => void {
  mutationListeners.add(listener)
  return () => {
    mutationListeners.delete(listener)
  }
}

export function notifyDataMutation(): void {
  store.clear()
  for (const listener of mutationListeners) {
    listener()
  }
}
