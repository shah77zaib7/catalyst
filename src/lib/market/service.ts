import {
  createMemoryQuoteCache,
  isFresh,
  isUsableStale,
  type QuoteCache,
} from "./cache";
import { ASSET_SYMBOLS } from "../../types/catalyst";
import {
  asCachedQuote,
  emptyQuote,
  normalizeTwelveDataQuote,
} from "./normalize";
import { PROVIDER_FAILURE_SOURCES, type MarketDataProvider } from "./provider";
import { createTwelveDataProvider } from "./providers/twelve-data";
import type { Asset, MarketQuote, SourceStatus } from "../../types/catalyst";
import type { IntegrationSnapshot } from "../integrations/registry";

export const DEFAULT_QUOTE_TTL_MS = 45_000;
export const DEFAULT_QUOTE_STALE_MS = 15 * 60 * 1000;

export type MarketServiceOptions = {
  provider?: MarketDataProvider;
  cache?: QuoteCache;
  ttlMs?: number;
  staleMs?: number;
  now?: () => number;
};

export type MarketService = {
  getQuotes(assets: readonly Asset[]): Promise<MarketQuote[]>;
  getSnapshot(): IntegrationSnapshot;
};

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createMarketService(options: MarketServiceOptions = {}): MarketService {
  const provider =
    options.provider ??
    createTwelveDataProvider({
      apiKey: process.env.TWELVE_DATA_API_KEY,
    });
  const cache = options.cache ?? createMemoryQuoteCache();
  const ttlMs = options.ttlMs ?? DEFAULT_QUOTE_TTL_MS;
  const staleMs = options.staleMs ?? DEFAULT_QUOTE_STALE_MS;
  const now = options.now ?? Date.now;

  let lastStatuses: SourceStatus[] = [];

  async function resolveAsset(asset: Asset): Promise<MarketQuote> {
    const symbol = ASSET_SYMBOLS[asset];
    const cached = cache.get(asset);
    const t = now();

    if (cached && isFresh(cached, t, ttlMs)) {
      return asCachedQuote(cached.quote);
    }

    const result = await provider.getQuote(symbol);
    if (result.ok) {
      const live = normalizeTwelveDataQuote(asset, result.payload, "live", provider.id);
      if (live) {
        cache.set(asset, live, t);
        return live;
      }
      if (cached && isUsableStale(cached, t, staleMs)) {
        return asCachedQuote(cached.quote);
      }
      return emptyQuote(asset, provider.id);
    }

    if (cached && isUsableStale(cached, t, staleMs)) {
      return asCachedQuote(cached.quote);
    }

    return emptyQuote(asset, provider.id);
  }

  return {
    async getQuotes(assets) {
      const unique = [...new Set(assets)];
      const quotes = await Promise.all(unique.map((asset) => resolveAsset(asset)));
      lastStatuses = quotes.map((quote) => quote.sourceStatus);
      return quotes;
    },
    getSnapshot() {
      const hasKey = Boolean(process.env.TWELVE_DATA_API_KEY?.trim());
      const hasLive = lastStatuses.includes("live");
      const hasCached = lastStatuses.includes("cached");
      const sourceStatus: SourceStatus = hasLive ? "live" : hasCached ? "cached" : "unavailable";
      const detail = !hasKey
        ? "TWELVE_DATA_API_KEY is not set. Market data is UNAVAILABLE."
        : sourceStatus === "live"
          ? "Twelve Data quotes are live."
          : sourceStatus === "cached"
            ? "Serving last known good Twelve Data quotes."
            : "Twelve Data did not return a usable quote.";
      return {
        id: "market-data",
        label: "Market data",
        sourceStatus,
        detail,
        lastUpdated: null,
      };
    },
  };
}

const defaultService = createMarketService({
  ttlMs: readPositiveInt(process.env.MARKET_QUOTE_TTL_MS, DEFAULT_QUOTE_TTL_MS),
  staleMs: readPositiveInt(process.env.MARKET_QUOTE_STALE_MS, DEFAULT_QUOTE_STALE_MS),
});

export function getMarketQuotes(assets: readonly Asset[]): Promise<MarketQuote[]> {
  return defaultService.getQuotes(assets);
}

export function getMarketIntegrationSnapshot(): IntegrationSnapshot {
  return defaultService.getSnapshot();
}

export function describeProviderFailure(kind: keyof typeof PROVIDER_FAILURE_SOURCES): string {
  return PROVIDER_FAILURE_SOURCES[kind];
}
