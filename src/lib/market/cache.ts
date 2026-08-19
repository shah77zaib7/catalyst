import type { Asset, MarketQuote } from "../../types/catalyst";

export type QuoteCacheEntry = {
  quote: MarketQuote;
  storedAt: number;
};

export type QuoteCache = {
  get(asset: Asset): QuoteCacheEntry | undefined;
  set(asset: Asset, quote: MarketQuote, storedAt: number): void;
  clear(): void;
};

export function createMemoryQuoteCache(): QuoteCache {
  const store = new Map<Asset, QuoteCacheEntry>();
  return {
    get(asset) {
      return store.get(asset);
    },
    set(asset, quote, storedAt) {
      store.set(asset, { quote, storedAt });
    },
    clear() {
      store.clear();
    },
  };
}

export function isFresh(entry: QuoteCacheEntry, now: number, ttlMs: number): boolean {
  return now - entry.storedAt <= ttlMs;
}

export function isUsableStale(entry: QuoteCacheEntry, now: number, staleMs: number): boolean {
  return now - entry.storedAt <= staleMs;
}
