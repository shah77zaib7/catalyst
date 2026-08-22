import type {
  AssetMarketReaction,
  CatalystEvent,
  IntelligenceSymbol,
  MarketReaction,
  PostWindowKey,
  PriceObservation,
  ReactionDirection,
  ReactionStrength,
  ReactionWindow,
} from "../../types/catalyst";
import { NEWS_ASSET_TO_SYMBOL } from "../../types/catalyst";
import type { MarketCandle } from "../market/normalize";
import {
  BASELINE_OFFSET_MS,
  FALLBACK_LATER_WINDOW,
  FLAT_THRESHOLD_PERCENT,
  GOOD_MAX_LATENCY_SECONDS,
  LATER_WINDOW,
  MIN_RELEVANCE_FOR_REACTION,
  OBSERVATION_TOLERANCE_MS,
  POST_WINDOWS,
  PRE_WINDOWS,
  PRIMARY_WINDOW,
  STRENGTH_THRESHOLDS,
} from "./config";

export function eventTimestampMs(event: CatalystEvent): number | null {
  const raw = event.intelligence?.identity.publishedAt ?? event.publishedAt;
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

export function returnPercent(observed: number, baseline: number): number | null {
  if (!Number.isFinite(observed) || !Number.isFinite(baseline) || baseline === 0) return null;
  return ((observed - baseline) / baseline) * 100;
}

export function reactionDirection(changePercent: number | null): ReactionDirection {
  if (changePercent == null || !Number.isFinite(changePercent)) return "UNKNOWN";
  if (Math.abs(changePercent) < FLAT_THRESHOLD_PERCENT) return "FLAT";
  return changePercent > 0 ? "UP" : "DOWN";
}

export function reactionStrength(absPercent: number | null): ReactionStrength | null {
  if (absPercent == null || !Number.isFinite(absPercent)) return null;
  const value = Math.abs(absPercent);
  for (const row of STRENGTH_THRESHOLDS) {
    if (value >= row.minInclusive) return row.strength;
  }
  return "VERY_LOW";
}

export function closestObservation(
  candles: readonly MarketCandle[],
  requestedAtMs: number,
  toleranceMs = OBSERVATION_TOLERANCE_MS,
): PriceObservation | null {
  let best: MarketCandle | null = null;
  let bestDelta = Infinity;
  let bestTime = Infinity;

  for (const candle of candles) {
    const time = Date.parse(candle.observedAt);
    if (Number.isNaN(time)) continue;
    const delta = Math.abs(time - requestedAtMs);
    if (delta < bestDelta || (delta === bestDelta && time < bestTime)) {
      best = candle;
      bestDelta = delta;
      bestTime = time;
    }
  }

  if (!best || bestDelta > toleranceMs) return null;
  return {
    requestedAt: new Date(requestedAtMs).toISOString(),
    observedAt: best.observedAt,
    price: best.close,
    deltaSeconds: Math.round(bestDelta / 1000),
  };
}

function windowFromObservation(
  requestedAtMs: number,
  observation: PriceObservation | null,
  baselinePrice: number | null,
  reason: ReactionWindow["reason"],
): ReactionWindow {
  const change =
    observation && baselinePrice != null && Number.isFinite(baselinePrice)
      ? observation.price - baselinePrice
      : null;
  const changePct =
    observation && baselinePrice != null ? returnPercent(observation.price, baselinePrice) : null;
  return {
    requestedAt: new Date(requestedAtMs).toISOString(),
    observedAt: observation?.observedAt ?? null,
    price: observation?.price ?? null,
    deltaSeconds: observation?.deltaSeconds ?? null,
    change,
    changePercent: changePct,
    direction: reactionDirection(changePct),
    reason: observation ? null : reason,
  };
}

export function relevantSymbols(event: CatalystEvent): IntelligenceSymbol[] {
  const scored = event.intelligence?.assets ?? [];
  const fromIntel = scored
    .filter((row) => row.relevance >= MIN_RELEVANCE_FOR_REACTION)
    .map((row) => row.symbol);
  if (fromIntel.length > 0) return [...new Set(fromIntel)];
  return [...new Set(event.assets.map((asset) => NEWS_ASSET_TO_SYMBOL[asset]))];
}

function observedRange(
  candles: readonly MarketCandle[],
  startMs: number,
  endMs: number,
  baselinePrice: number | null,
): AssetMarketReaction["observedRange"] {
  const inWindow = candles.filter((candle) => {
    const time = Date.parse(candle.observedAt);
    return !Number.isNaN(time) && time >= startMs && time <= endMs;
  });
  if (inWindow.length === 0) return null;

  const withOhlc = inWindow.filter((candle) => candle.high != null && candle.low != null);
  if (withOhlc.length >= 2) {
    const high = Math.max(...withOhlc.map((candle) => candle.high as number));
    const low = Math.min(...withOhlc.map((candle) => candle.low as number));
    const range = high - low;
    const denom = baselinePrice && baselinePrice !== 0 ? baselinePrice : low;
    return {
      high,
      low,
      range,
      rangePercent: denom ? (range / denom) * 100 : 0,
      source: "provider_ohlc",
    };
  }

  const closes = inWindow.map((candle) => candle.close);
  if (closes.length < 2) return null;
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const range = high - low;
  const denom = baselinePrice && baselinePrice !== 0 ? baselinePrice : low;
  return {
    high,
    low,
    range,
    rangePercent: denom ? (range / denom) * 100 : 0,
    source: "observed_closes",
  };
}

function maximumMove(windows: ReactionWindow[]): AssetMarketReaction["maximumMove"] {
  const percents = windows
    .map((row) => row.changePercent)
    .filter((value): value is number => value != null && Number.isFinite(value));
  if (percents.length === 0) return null;
  const ups = percents.filter((value) => value > 0);
  const downs = percents.filter((value) => value < 0);
  const upPercent = ups.length > 0 ? Math.max(...ups) : 0;
  const downPercent = downs.length > 0 ? Math.min(...downs) : 0;
  return {
    upPercent,
    downPercent,
    absolutePercent: Math.max(Math.abs(upPercent), Math.abs(downPercent)),
  };
}

export function observeAsset(
  symbol: IntelligenceSymbol,
  candles: readonly MarketCandle[],
  eventAtMs: number,
  nowMs: number,
  toleranceMs = OBSERVATION_TOLERANCE_MS,
): AssetMarketReaction {
  const baselineAt = eventAtMs + BASELINE_OFFSET_MS;
  const eventRequested = eventAtMs;
  const baseline = closestObservation(candles, baselineAt, toleranceMs);
  const eventPrice = closestObservation(candles, eventRequested, toleranceMs);
  const pre15 = closestObservation(candles, eventAtMs + PRE_WINDOWS[0].offsetMs, toleranceMs);

  const pre15to5 =
    pre15 && baseline ? returnPercent(baseline.price, pre15.price) : null;
  const pre5toEvent =
    baseline && eventPrice ? returnPercent(eventPrice.price, baseline.price) : null;

  const windows = {} as Record<PostWindowKey, ReactionWindow>;
  const latencies: number[] = [];
  const missingWindows: string[] = [];

  if (!baseline) missingWindows.push("baseline");
  else latencies.push(baseline.deltaSeconds);
  if (!eventPrice) missingWindows.push("event");
  else latencies.push(eventPrice.deltaSeconds);

  for (const window of POST_WINDOWS) {
    const requestedAtMs = eventAtMs + window.offsetMs;
    const elapsed = nowMs >= requestedAtMs;
    const observation = elapsed ? closestObservation(candles, requestedAtMs, toleranceMs) : null;
    windows[window.key] = windowFromObservation(
      requestedAtMs,
      observation,
      baseline?.price ?? null,
      elapsed ? "no_observation" : "not_elapsed",
    );
    if (!elapsed) missingWindows.push(window.key);
    else if (!observation) missingWindows.push(window.key);
    else latencies.push(observation.deltaSeconds);
  }

  const primary = windows[PRIMARY_WINDOW];
  const later = windows[LATER_WINDOW].price != null ? windows[LATER_WINDOW] : windows[FALLBACK_LATER_WINDOW];
  const primaryDirection = primary.direction;
  const laterDirection = later.direction;
  const reversed =
    (primaryDirection === "UP" && laterDirection === "DOWN") ||
    (primaryDirection === "DOWN" && laterDirection === "UP");

  const requiredMissing = ["baseline", "event", PRIMARY_WINDOW].filter((key) => missingWindows.includes(key));
  const elapsedMissing = missingWindows.filter((key) => {
    const post = POST_WINDOWS.find((row) => row.key === key);
    if (key === "baseline" || key === "event") return true;
    if (!post) return true;
    return nowMs >= eventAtMs + post.offsetMs;
  });
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : null;

  let quality: AssetMarketReaction["dataQuality"]["status"] = "GOOD";
  let qualityReason: string | null = null;
  if (candles.length === 0) {
    quality = "UNAVAILABLE";
    qualityReason = "no_candles";
  } else if (requiredMissing.length > 0) {
    quality = "INSUFFICIENT";
    qualityReason = `missing:${requiredMissing.join(",")}`;
  } else if (elapsedMissing.length > 0 || (maxLatency != null && maxLatency > GOOD_MAX_LATENCY_SECONDS)) {
    quality = "PARTIAL";
    qualityReason = elapsedMissing.length > 0 ? `missing:${elapsedMissing.join(",")}` : "high_latency";
  }

  const canSummarize = quality === "GOOD" || quality === "PARTIAL";
  const summaryWindows = [eventPrice ? windowFromObservation(eventAtMs, eventPrice, baseline?.price ?? null, null) : null, ...Object.values(windows)].filter(
    (row): row is ReactionWindow => Boolean(row && row.changePercent != null),
  );

  return {
    symbol,
    baseline,
    eventPrice,
    preEvent:
      pre15to5 != null || pre5toEvent != null
        ? {
            "15mReturnPercent": pre15to5,
            "5mReturnPercent": pre5toEvent,
            direction: reactionDirection(pre5toEvent),
          }
        : null,
    windows,
    maximumMove: canSummarize ? maximumMove(summaryWindows) : null,
    observedRange: canSummarize
      ? observedRange(candles, eventAtMs + PRE_WINDOWS[0].offsetMs, Math.min(nowMs, eventAtMs + POST_WINDOWS[POST_WINDOWS.length - 1].offsetMs), baseline?.price ?? null)
      : null,
    primaryReaction: {
      window: PRIMARY_WINDOW,
      direction: primaryDirection,
      changePercent: primary.changePercent,
      strength: reactionStrength(primary.changePercent != null ? Math.abs(primary.changePercent) : null),
    },
    reversal: {
      detected: reversed,
      initialDirection: reversed ? primaryDirection : undefined,
      laterDirection: reversed ? laterDirection : undefined,
    },
    dataQuality: {
      status: quality,
      missingWindows,
      maxObservationLatencySeconds: maxLatency,
      reason: qualityReason,
    },
  };
}

export function observeEvent(
  event: CatalystEvent,
  candlesBySymbol: Partial<Record<IntelligenceSymbol, readonly MarketCandle[]>>,
  nowMs: number,
  options?: { source?: string; sourceStatus?: MarketReaction["sourceStatus"] },
): MarketReaction {
  const eventAt = eventTimestampMs(event);
  if (eventAt == null) {
    return {
      status: "UNAVAILABLE",
      eventAt: null,
      source: options?.source ?? "twelve-data",
      sourceStatus: "unavailable",
      assets: {},
      reason: "missing_event_timestamp",
    };
  }

  const symbols = relevantSymbols(event);
  if (symbols.length === 0) {
    return {
      status: "UNAVAILABLE",
      eventAt: new Date(eventAt).toISOString(),
      source: options?.source ?? "twelve-data",
      sourceStatus: "unavailable",
      assets: {},
      reason: "no_relevant_assets",
    };
  }

  const assets: MarketReaction["assets"] = {};
  for (const symbol of symbols) {
    const candles = candlesBySymbol[symbol] ?? [];
    assets[symbol] = observeAsset(symbol, candles, eventAt, nowMs);
  }

  const qualities = Object.values(assets).map((row) => row.dataQuality.status);
  let status: MarketReaction["status"] = "UNAVAILABLE";
  if (qualities.some((row) => row === "GOOD")) status = "OBSERVED";
  else if (qualities.some((row) => row === "PARTIAL")) status = "PARTIAL";
  else if (qualities.some((row) => row === "INSUFFICIENT")) status = "INSUFFICIENT";

  return {
    status,
    eventAt: new Date(eventAt).toISOString(),
    source: options?.source ?? "twelve-data",
    sourceStatus: options?.sourceStatus ?? (status === "UNAVAILABLE" ? "unavailable" : "live"),
    assets,
    reason: status === "UNAVAILABLE" ? "no_valid_observations" : null,
  };
}
