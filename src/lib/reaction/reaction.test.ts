import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalystEvent } from "../../types/catalyst";
import type { MarketCandle } from "../market/normalize";
import { normalizeTwelveDataTimeSeries } from "../market/normalize";
import type { MarketDataProvider } from "../market/provider";
import { analyzeEvent } from "../intelligence/engine";
import { FLAT_THRESHOLD_PERCENT, OBSERVATION_TOLERANCE_MS, STRENGTH_THRESHOLDS } from "./config";
import {
  closestObservation,
  eventTimestampMs,
  observeAsset,
  observeEvent,
  reactionDirection,
  reactionStrength,
  returnPercent,
} from "./engine";
import { createReactionService } from "./service";

const T = Date.parse("2026-08-19T12:00:00.000Z");
const NOW = Date.parse("2026-08-19T16:30:00.000Z");

function iso(offsetMs: number): string {
  return new Date(T + offsetMs).toISOString();
}

function candle(offsetMs: number, close: number, ohlc = false): MarketCandle {
  return {
    observedAt: iso(offsetMs),
    close,
    open: ohlc ? close : null,
    high: ohlc ? close + 2 : null,
    low: ohlc ? close - 2 : null,
  };
}

function series(points: Array<[number, number]>, ohlc = false): MarketCandle[] {
  return points.map(([offset, close]) => candle(offset, close, ohlc));
}

function evt(partial: Partial<CatalystEvent> & Pick<CatalystEvent, "title">): CatalystEvent {
  const base: CatalystEvent = {
    id: "evt_cpi",
    summary: "",
    source: "BLS",
    sourceUrl: "https://example.com/cpi",
    sourceUrls: ["https://example.com/cpi"],
    publishedAt: iso(0),
    fetchedAt: iso(60_000),
    assets: ["gold", "usd"],
    categories: ["macro"],
    impact: null,
    sourceStatus: "live",
    providers: ["fred"],
    ...partial,
  };
  return { ...base, intelligence: analyzeEvent(base, NOW) };
}

const GOLD = series(
  [
    [-15 * 60_000, 100],
    [-5 * 60_000, 100.18],
    [-60_000, 100.2],
    [0, 100.22],
    [60_000, 100.1],
    [5 * 60_000, 99.9],
    [15 * 60_000, 99.47],
    [30 * 60_000, 99.2],
    [60 * 60_000, 100.5],
    [4 * 60 * 60_000, 100.4],
  ],
  true,
);

test("event timestamp prefers publishedAt and ignores fetchedAt", () => {
  const event = evt({
    title: "US CPI rises more than expected",
    publishedAt: iso(0),
    fetchedAt: iso(10 * 60_000),
  });
  assert.equal(eventTimestampMs(event), T);
  assert.equal(eventTimestampMs(evt({ title: "US CPI", publishedAt: null })), null);
});

test("closest observation respects tolerance and does not interpolate", () => {
  const candles = [candle(4_000, 10), candle(200_000, 11)];
  const hit = closestObservation(candles, T, OBSERVATION_TOLERANCE_MS);
  assert.ok(hit);
  assert.equal(hit?.price, 10);
  assert.equal(hit?.deltaSeconds, 4);

  const miss = closestObservation([candle(200_000, 11)], T, OBSERVATION_TOLERANCE_MS);
  assert.equal(miss, null);
});

test("return formula and direction / flat threshold", () => {
  assert.equal(returnPercent(99.29, 100), ((99.29 - 100) / 100) * 100);
  assert.equal(reactionDirection(0.05), "UP");
  assert.equal(reactionDirection(-0.05), "DOWN");
  assert.equal(reactionDirection(FLAT_THRESHOLD_PERCENT / 2), "FLAT");
  assert.equal(reactionDirection(null), "UNKNOWN");
});

test("reaction strength boundary values", () => {
  assert.equal(STRENGTH_THRESHOLDS[0]?.minInclusive, 1.5);
  assert.equal(reactionStrength(0.099), "VERY_LOW");
  assert.equal(reactionStrength(0.1), "LOW");
  assert.equal(reactionStrength(0.299), "LOW");
  assert.equal(reactionStrength(0.3), "MODERATE");
  assert.equal(reactionStrength(0.749), "MODERATE");
  assert.equal(reactionStrength(0.75), "HIGH");
  assert.equal(reactionStrength(1.499), "HIGH");
  assert.equal(reactionStrength(1.5), "EXTREME");
});

test("baseline, event price, pre-event, post windows, max move, range, reversal", () => {
  const gold = observeAsset("XAUUSD", GOLD, T, NOW);
  assert.ok(gold.baseline);
  assert.equal(gold.baseline?.price, 100.18);
  assert.ok(gold.eventPrice);
  assert.equal(gold.eventPrice?.price, 100.22);

  assert.ok(gold.preEvent);
  assert.ok((gold.preEvent?.["15mReturnPercent"] ?? 0) > 0);
  assert.equal(gold.preEvent?.direction, "UP");

  const at15 = gold.windows["15m"];
  assert.ok(at15.price);
  assert.equal(at15.direction, "DOWN");
  assert.ok((at15.changePercent ?? 0) < 0);
  assert.equal(gold.primaryReaction.direction, "DOWN");
  assert.equal(gold.primaryReaction.strength, "MODERATE");

  assert.ok(gold.maximumMove);
  assert.ok((gold.maximumMove?.downPercent ?? 0) < 0);
  assert.ok((gold.maximumMove?.upPercent ?? 0) > 0);
  assert.ok((gold.maximumMove?.absolutePercent ?? 0) > 0);

  assert.ok(gold.observedRange);
  assert.equal(gold.observedRange?.source, "provider_ohlc");
  assert.ok((gold.observedRange?.high ?? 0) > (gold.observedRange?.low ?? 0));

  assert.equal(gold.reversal.detected, true);
  assert.equal(gold.reversal.initialDirection, "DOWN");
  assert.equal(gold.reversal.laterDirection, "UP");
  assert.equal(gold.dataQuality.status, "GOOD");
});

test("missing windows yield INSUFFICIENT and do not fabricate prices", () => {
  const sparse = observeAsset("XAUUSD", [candle(-5 * 60_000, 100)], T, NOW);
  assert.equal(sparse.eventPrice, null);
  assert.equal(sparse.windows["15m"].price, null);
  assert.equal(sparse.windows["15m"].reason, "no_observation");
  assert.equal(sparse.dataQuality.status, "INSUFFICIENT");
  assert.equal(sparse.maximumMove, null);
  assert.doesNotMatch(JSON.stringify(sparse), /interpolat/i);
});

test("future windows are not_elapsed, not zero movement", () => {
  const early = observeAsset("XAUUSD", GOLD, T, T + 6 * 60_000);
  assert.equal(early.windows["1m"].price, 100.1);
  assert.equal(early.windows["15m"].reason, "not_elapsed");
  assert.equal(early.windows["15m"].price, null);
  assert.equal(early.windows["15m"].changePercent, null);
  assert.notEqual(early.dataQuality.status, "UNAVAILABLE");
});

test("empty candles are UNAVAILABLE, never treated as flat zero", () => {
  const empty = observeAsset("BTC", [], T, NOW);
  assert.equal(empty.dataQuality.status, "UNAVAILABLE");
  assert.equal(empty.primaryReaction.direction, "UNKNOWN");
  assert.equal(empty.windows["15m"].direction, "UNKNOWN");
});

test("historical reconstruction from a full series is deterministic", () => {
  const event = evt({ title: "US CPI rises more than expected" });
  const first = observeEvent(event, { XAUUSD: GOLD, USD: GOLD }, NOW);
  const second = observeEvent(event, { XAUUSD: GOLD, USD: GOLD }, NOW);
  assert.deepEqual(first, second);
  assert.equal(first.status, "OBSERVED");
  assert.ok(first.assets.XAUUSD);
  assert.ok(first.assets.USD);
  assert.doesNotMatch(JSON.stringify(first), /caused|bullish|bearish|buy|sell|forecast/i);
});

test("provider failure on one asset does not block another", async () => {
  const provider: MarketDataProvider = {
    id: "twelve-data",
    getQuote: async () => ({ ok: false, symbol: "x", kind: "network", message: "down" }),
    getTimeSeries: async (query) => {
      if (query.symbol === "DXY") {
        return { ok: false, symbol: query.symbol, kind: "network", message: "down" };
      }
      return {
        ok: true,
        symbol: query.symbol,
        payload: {
          values: GOLD.map((row) => ({
            datetime: row.observedAt.replace("T", " ").replace("Z", ""),
            close: String(row.close),
            high: String(row.high),
            low: String(row.low),
            open: String(row.open),
          })),
        },
      };
    },
  };

  const service = createReactionService({ provider, now: () => NOW });
  const [result] = await service.attach([evt({ title: "US CPI rises more than expected" })]);
  assert.ok(result.marketReaction);
  assert.ok(result.marketReaction?.assets.XAUUSD);
  assert.equal(result.marketReaction?.assets.XAUUSD?.dataQuality.status, "GOOD");
  assert.equal(result.marketReaction?.assets.USD?.dataQuality.status, "UNAVAILABLE");
});

test("time series cache prevents repeat provider calls", async () => {
  let calls = 0;
  const provider: MarketDataProvider = {
    id: "twelve-data",
    getQuote: async () => ({ ok: false, symbol: "x", kind: "network", message: "x" }),
    getTimeSeries: async (query) => {
      calls += 1;
      return {
        ok: true,
        symbol: query.symbol,
        payload: { values: [{ datetime: iso(-5 * 60_000).replace("T", " ").replace(".000Z", ""), close: "100" }] },
      };
    },
  };
  const service = createReactionService({ provider, now: () => NOW });
  const event = evt({ title: "FOMC holds rates steady", assets: ["gold", "usd", "btc"] });
  await service.attach([event, event]);
  const first = calls;
  await service.attach([event]);
  assert.equal(calls, first);
});

test("malformed series normalizes to empty without invented closes", () => {
  assert.equal(normalizeTwelveDataTimeSeries({ status: "error", code: 429, message: "limit" }), null);
  assert.deepEqual(normalizeTwelveDataTimeSeries({ values: [{ datetime: "bad", close: "nope" }] }), []);
  const rows = normalizeTwelveDataTimeSeries({
    values: [{ datetime: "2026-08-19 12:00:00", close: "3350.20", high: "3351", low: "3349", open: "3350" }],
  });
  assert.equal(rows?.[0]?.close, 3350.2);
  assert.equal(rows?.[0]?.observedAt, "2026-08-19T12:00:00.000Z");
});

test("missing getTimeSeries is unavailable and does not crash", async () => {
  const provider: MarketDataProvider = {
    id: "twelve-data",
    getQuote: async () => ({ ok: false, symbol: "x", kind: "missing_key", message: "none" }),
  };
  const service = createReactionService({ provider, now: () => NOW });
  const [result] = await service.attach([evt({ title: "US CPI rises more than expected" })]);
  assert.equal(result.marketReaction?.assets.XAUUSD?.dataQuality.status, "UNAVAILABLE");
});

test("low-importance events are not selected for live provider fetches", async () => {
  let calls = 0;
  const provider: MarketDataProvider = {
    id: "twelve-data",
    getQuote: async () => ({ ok: false, symbol: "x", kind: "network", message: "x" }),
    getTimeSeries: async () => {
      calls += 1;
      return { ok: true, symbol: "XAU/USD", payload: { values: [] } };
    },
  };
  const service = createReactionService({ provider, now: () => NOW });
  await service.attach([evt({ title: "Local weather delays a parade", assets: [] })]);
  assert.equal(calls, 0);
});
