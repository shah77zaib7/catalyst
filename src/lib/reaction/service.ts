import type { CatalystEvent, IntelligenceSymbol, MarketReaction, SourceStatus } from "../../types/catalyst";
import type { MarketCandle } from "../market/normalize";
import { normalizeTwelveDataTimeSeries } from "../market/normalize";
import type { MarketDataProvider } from "../market/provider";
import { createTwelveDataProvider } from "../market/providers/twelve-data";
import {
  IMPORTANCE_RANK,
  MAX_ASSETS_PER_EVENT,
  MAX_REACTION_EVENTS_PER_FEED,
  MIN_IMPORTANCE_FOR_REACTION,
  PROVIDER_SYMBOL,
  REACTION_INTERVAL,
  SERIES_LOOKAHEAD_MS,
  SERIES_LOOKBACK_MS,
  SERIES_PADDING_MS,
  COMPLETED_SERIES_TTL_MS,
  IN_PROGRESS_SERIES_TTL_MS,
} from "./config";
import { eventTimestampMs, observeEvent, relevantSymbols } from "./engine";

type SeriesEntry = {
  candles: MarketCandle[];
  storedAt: number;
  sourceStatus: SourceStatus;
};

export type ReactionServiceOptions = {
  provider?: MarketDataProvider;
  now?: () => number;
  cache?: Map<string, SeriesEntry>;
};

function seriesKey(symbol: string, startMs: number, endMs: number): string {
  return `${symbol}|${REACTION_INTERVAL}|${startMs}|${endMs}`;
}

export function shouldObserveEvent(event: CatalystEvent): boolean {
  if (eventTimestampMs(event) == null) return false;
  if (relevantSymbols(event).length === 0) return false;
  const tier = event.intelligence?.importance.tier ?? "LOW";
  return IMPORTANCE_RANK[tier] >= IMPORTANCE_RANK[MIN_IMPORTANCE_FOR_REACTION];
}

export function createReactionService(options: ReactionServiceOptions = {}) {
  const provider =
    options.provider ??
    createTwelveDataProvider({
      apiKey: process.env.TWELVE_DATA_API_KEY,
    });
  const now = options.now ?? Date.now;
  const cache = options.cache ?? new Map<string, SeriesEntry>();

  async function loadSeries(
    symbol: IntelligenceSymbol,
    eventAtMs: number,
  ): Promise<{ candles: MarketCandle[]; sourceStatus: SourceStatus }> {
    const t = now();
    const startMs = eventAtMs - SERIES_LOOKBACK_MS - SERIES_PADDING_MS;
    const naturalEnd = eventAtMs + SERIES_LOOKAHEAD_MS + SERIES_PADDING_MS;
    const endMs = Math.min(t, naturalEnd);
    const providerSymbol = PROVIDER_SYMBOL[symbol];
    const key = seriesKey(providerSymbol, startMs, endMs);
    const cached = cache.get(key);
    const complete = endMs >= eventAtMs + SERIES_LOOKAHEAD_MS;
    const ttl = complete ? COMPLETED_SERIES_TTL_MS : IN_PROGRESS_SERIES_TTL_MS;
    if (cached && t - cached.storedAt <= ttl) {
      return { candles: cached.candles, sourceStatus: "cached" };
    }

    if (!provider.getTimeSeries) {
      return { candles: [], sourceStatus: "unavailable" };
    }

    const result = await provider.getTimeSeries({
      symbol: providerSymbol,
      startUtc: new Date(startMs).toISOString(),
      endUtc: new Date(endMs).toISOString(),
      interval: REACTION_INTERVAL,
    });

    if (!result.ok) {
      return { candles: [], sourceStatus: "unavailable" };
    }

    const candles = normalizeTwelveDataTimeSeries(result.payload) ?? [];
    cache.set(key, { candles, storedAt: t, sourceStatus: "live" });
    return { candles, sourceStatus: "live" };
  }

  async function observeOne(event: CatalystEvent): Promise<MarketReaction> {
    const eventAt = eventTimestampMs(event);
    if (eventAt == null) {
      return observeEvent(event, {}, now(), { sourceStatus: "unavailable" });
    }

    const symbols = relevantSymbols(event).slice(0, MAX_ASSETS_PER_EVENT);
    const candlesBySymbol: Partial<Record<IntelligenceSymbol, MarketCandle[]>> = {};
    const statuses: SourceStatus[] = [];

    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const series = await loadSeries(symbol, eventAt);
          candlesBySymbol[symbol] = series.candles;
          statuses.push(series.sourceStatus);
        } catch {
          candlesBySymbol[symbol] = [];
          statuses.push("unavailable");
        }
      }),
    );

    const sourceStatus: SourceStatus = statuses.includes("live")
      ? "live"
      : statuses.includes("cached")
        ? "cached"
        : "unavailable";

    return observeEvent(event, candlesBySymbol, now(), {
      source: provider.id,
      sourceStatus,
    });
  }

  return {
    async attach(events: CatalystEvent[]): Promise<CatalystEvent[]> {
      try {
        const ranked = events
          .map((event, index) => ({ event, index }))
          .filter((row) => shouldObserveEvent(row.event))
          .sort((a, b) => {
            const rankA = IMPORTANCE_RANK[a.event.intelligence?.importance.tier ?? "LOW"];
            const rankB = IMPORTANCE_RANK[b.event.intelligence?.importance.tier ?? "LOW"];
            if (rankA !== rankB) return rankB - rankA;
            return (b.event.intelligence?.score.overall ?? 0) - (a.event.intelligence?.score.overall ?? 0);
          })
          .slice(0, MAX_REACTION_EVENTS_PER_FEED);

        const observed = new Map<number, MarketReaction>();
        for (const row of ranked) {
          observed.set(row.index, await observeOne(row.event));
        }

        return events.map((event, index) => {
          const reaction = observed.get(index);
          if (reaction) return { ...event, marketReaction: reaction };
          if (event.marketReaction) return event;
          return {
            ...event,
            marketReaction: {
              status: "UNAVAILABLE",
              eventAt: event.publishedAt,
              source: provider.id,
              sourceStatus: "unavailable",
              assets: {},
              reason: shouldObserveEvent(event) ? "not_selected" : "below_importance_or_missing_timestamp",
            },
          };
        });
      } catch {
        return events.map((event) => ({
          ...event,
          marketReaction: event.marketReaction ?? {
            status: "UNAVAILABLE",
            eventAt: event.publishedAt,
            source: provider.id,
            sourceStatus: "unavailable",
            assets: {},
            reason: "reaction_engine_failure",
          },
        }));
      }
    },
  };
}

const defaultReactionService = createReactionService();

export function attachObservedReactions(events: CatalystEvent[]): Promise<CatalystEvent[]> {
  return defaultReactionService.attach(events);
}
