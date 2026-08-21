import type { CatalystEvent, NewsAsset, SourceStatus } from "../../types/catalyst";
import type { IntegrationSnapshot } from "../integrations/registry";
import { createMemoryNewsCache, isFresh, isUsableStale, type NewsCache } from "./cache";
import { clusterEvents } from "./dedupe";
import { normalizeRawItem } from "./normalize";
import { enrichWithIntelligence } from "../intelligence/engine";
import type { NewsProvider, RawNewsItem } from "./provider";
import { createAlphaVantageProvider } from "./providers/alpha-vantage";
import { createCoinGeckoProvider } from "./providers/coingecko";
import { createFredProvider } from "./providers/fred";
import { createGdeltProvider } from "./providers/gdelt";
import { createSoSoValueProvider } from "./providers/sosovalue";

export type NewsFeed = {
  events: CatalystEvent[];
  status: SourceStatus;
  providers: IntegrationSnapshot[];
};

export type NewsServiceOptions = {
  providers?: NewsProvider[];
  cache?: NewsCache;
  now?: () => number;
};

type ProviderPull = {
  provider: NewsProvider;
  items: RawNewsItem[];
  sourceStatus: SourceStatus;
  detail: string;
};

export function createNewsService(options: NewsServiceOptions = {}) {
  const providers =
    options.providers ??
    [
      createGdeltProvider(),
      createCoinGeckoProvider({ apiKey: process.env.COINGECKO_API_KEY }),
      createSoSoValueProvider({ apiKey: process.env.SOSOVALUE_API_KEY }),
      createFredProvider({ apiKey: process.env.FRED_API_KEY }),
      createAlphaVantageProvider({ apiKey: process.env.ALPHA_VANTAGE_API_KEY }),
    ];
  const cache = options.cache ?? createMemoryNewsCache();
  const now = options.now ?? Date.now;

  async function pullProvider(provider: NewsProvider): Promise<ProviderPull> {
    const cached = cache.get(provider.id);
    const t = now();
    if (cached && isFresh(cached, t, provider.ttlMs)) {
      return {
        provider,
        items: cached.items,
        sourceStatus: "cached",
        detail: `Serving cached ${provider.label} items.`,
      };
    }

    const result = await provider.fetchItems();
    if (result.ok) {
      cache.set(provider.id, result.items, t);
      return {
        provider,
        items: result.items,
        sourceStatus: "live",
        detail:
          result.items.length > 0
            ? `${provider.label} returned ${result.items.length} item(s).`
            : `${provider.label} returned an empty feed.`,
      };
    }

    if (cached && isUsableStale(cached, t, provider.staleMs)) {
      return {
        provider,
        items: cached.items,
        sourceStatus: "cached",
        detail: `${provider.label} failed (${result.kind}); using last known good items.`,
      };
    }

    return {
      provider,
      items: [],
      sourceStatus: "unavailable",
      detail:
        result.kind === "missing_key"
          ? `${provider.label} is not configured.`
          : `${provider.label} is unavailable (${result.kind}).`,
    };
  }

  return {
    async getFeed(filter?: { assets?: NewsAsset[]; limit?: number }): Promise<NewsFeed> {
      const pulls = await Promise.all(providers.map((provider) => pullProvider(provider)));
      const fetchedAt = new Date(now()).toISOString();
      const normalized: CatalystEvent[] = [];

      for (const pull of pulls) {
        for (const item of pull.items) {
          const event = normalizeRawItem(item, pull.sourceStatus, fetchedAt);
          if (event) normalized.push(event);
        }
      }

      let events = clusterEvents(normalized).map((event) => enrichWithIntelligence(event, now()));
      if (filter?.assets && filter.assets.length > 0) {
        const wanted = new Set(filter.assets);
        events = events.filter((event) => event.assets.some((asset) => wanted.has(asset)));
      }
      if (filter?.limit && filter.limit > 0) {
        events = events.slice(0, filter.limit);
      }

      const live = pulls.some((pull) => pull.sourceStatus === "live" && pull.items.length > 0);
      const cached = pulls.some((pull) => pull.sourceStatus === "cached" && pull.items.length > 0);
      const status: SourceStatus = live ? "live" : cached ? "cached" : "unavailable";

      return {
        events,
        status,
        providers: pulls.map((pull) => ({
          id: "news",
          label: pull.provider.label,
          sourceStatus: pull.sourceStatus,
          detail: pull.detail,
          lastUpdated: cache.get(pull.provider.id)
            ? new Date(cache.get(pull.provider.id)!.storedAt).toISOString()
            : null,
        })),
      };
    },
    getSnapshot(): IntegrationSnapshot {
      return {
        id: "news",
        label: "News",
        sourceStatus: "unavailable",
        detail: "News providers have not been queried yet.",
        lastUpdated: null,
      };
    },
  };
}

const defaultService = createNewsService();

export function getNewsFeed(filter?: { assets?: NewsAsset[]; limit?: number }): Promise<NewsFeed> {
  return defaultService.getFeed(filter);
}
