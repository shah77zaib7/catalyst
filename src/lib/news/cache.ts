import type { RawNewsItem } from "./provider";

export type NewsCacheEntry = {
  items: RawNewsItem[];
  storedAt: number;
};

export type NewsCache = {
  get(providerId: string): NewsCacheEntry | undefined;
  set(providerId: string, items: RawNewsItem[], storedAt: number): void;
  clear(): void;
};

export function createMemoryNewsCache(): NewsCache {
  const store = new Map<string, NewsCacheEntry>();
  return {
    get(providerId) {
      return store.get(providerId);
    },
    set(providerId, items, storedAt) {
      store.set(providerId, { items, storedAt });
    },
    clear() {
      store.clear();
    },
  };
}

export function isFresh(entry: NewsCacheEntry, now: number, ttlMs: number): boolean {
  return now - entry.storedAt <= ttlMs;
}

export function isUsableStale(entry: NewsCacheEntry, now: number, staleMs: number): boolean {
  return now - entry.storedAt <= staleMs;
}
