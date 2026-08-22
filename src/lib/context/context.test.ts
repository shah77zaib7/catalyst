import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalystEvent, MarketReaction } from "../../types/catalyst";
import { analyzeEvent } from "../intelligence/engine";
import { SIMULTANEOUS_MS, MAX_RELATED_EVENTS, PRE_CONTEXT_MS, WIDER_CONTEXT_MS } from "./config";
import { attachEventContext, classifyRelationship, rankValue } from "./engine";

const T = Date.parse("2026-08-19T12:30:00.000Z");
const NOW = Date.parse("2026-08-19T18:00:00.000Z");

function iso(offsetMs: number): string {
  return new Date(T + offsetMs).toISOString();
}

function evt(
  id: string,
  title: string,
  offsetMs: number,
  extra: Partial<CatalystEvent> = {},
): CatalystEvent {
  const base: CatalystEvent = {
    summary: "",
    source: "Reuters",
    sourceUrl: `https://example.com/${id}`,
    sourceUrls: [`https://example.com/${id}`],
    fetchedAt: iso(offsetMs + 60_000),
    assets: [],
    categories: [],
    impact: null,
    sourceStatus: "live",
    providers: ["gdelt"],
    ...extra,
    id,
    title,
    publishedAt: extra.publishedAt === null ? null : extra.publishedAt ?? iso(offsetMs),
  };
  return { ...base, intelligence: analyzeEvent(base, NOW) };
}

function reaction(partial: Partial<MarketReaction["assets"]> = {}): MarketReaction {
  return {
    status: "OBSERVED",
    eventAt: iso(0),
    source: "twelve-data",
    sourceStatus: "live",
    reason: null,
    assets: {
      XAUUSD: {
        symbol: "XAUUSD",
        baseline: { requestedAt: iso(-5 * 60_000), observedAt: iso(-5 * 60_000), price: 100, deltaSeconds: 0 },
        eventPrice: { requestedAt: iso(0), observedAt: iso(0), price: 100.1, deltaSeconds: 0 },
        preEvent: { "15mReturnPercent": 0.18, "5mReturnPercent": 0.18, direction: "UP" },
        windows: {
          "1m": emptyWindow(),
          "5m": emptyWindow(),
          "15m": {
            requestedAt: iso(15 * 60_000),
            observedAt: iso(15 * 60_000),
            price: 99.29,
            deltaSeconds: 0,
            change: -0.71,
            changePercent: -0.71,
            direction: "DOWN",
            reason: null,
          },
          "30m": emptyWindow(),
          "1h": emptyWindow(),
          "4h": emptyWindow(),
        },
        maximumMove: { upPercent: 0, downPercent: -0.71, absolutePercent: 0.71 },
        observedRange: null,
        primaryReaction: { window: "15m", direction: "DOWN", changePercent: -0.71, strength: "MODERATE" },
        reversal: { detected: false },
        dataQuality: { status: "GOOD", missingWindows: [], maxObservationLatencySeconds: 0, reason: null },
      },
      ...partial,
    },
  };
}

function emptyWindow() {
  return {
    requestedAt: iso(0),
    observedAt: null,
    price: null,
    deltaSeconds: null,
    change: null,
    changePercent: null,
    direction: "UNKNOWN" as const,
    reason: "not_elapsed" as const,
  };
}

test("boundary: 4:59 and 5:00 are simultaneous; 5:01 is not", () => {
  const primary = evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] });
  const at459 = evt("a", "NFP revision printed", 4 * 60_000 + 59_000, { assets: ["gold", "usd"] });
  const at500 = evt("b", "NFP revision printed", 5 * 60_000, { assets: ["gold", "usd"] });
  const at501 = evt("c", "NFP revision printed", 5 * 60_000 + 1_000, { assets: ["gold", "usd"] });
  assert.ok(classifyRelationship(primary, at459, 299).relationship.includes("SIMULTANEOUS"));
  assert.ok(classifyRelationship(primary, at500, 300).relationship.includes("SIMULTANEOUS"));
  assert.equal(SIMULTANEOUS_MS, 5 * 60 * 1000);
  assert.ok(!classifyRelationship(primary, at501, 301).relationship.includes("SIMULTANEOUS"));
  assert.ok(classifyRelationship(primary, at501, 301).relationship.includes("NEARBY"));
});

test("boundary: 59:59 and 60:00 are nearby; 60:01 is only wider context", () => {
  const primary = evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] });
  const at5959 = evt("a", "Gold ETF flow update", 59 * 60_000 + 59_000, { assets: ["gold"] });
  const at6000 = evt("b", "Gold ETF flow update", 60 * 60_000, { assets: ["gold"] });
  const at6001 = evt("c", "Gold ETF flow update", 60 * 60_000 + 1_000, { assets: ["gold"] });
  assert.ok(classifyRelationship(primary, at5959, 3599).relationship.includes("NEARBY"));
  assert.ok(classifyRelationship(primary, at6000, 3600).relationship.includes("NEARBY"));
  assert.ok(!classifyRelationship(primary, at6001, 3601).relationship.includes("NEARBY"));
  assert.equal(PRE_CONTEXT_MS, 60 * 60 * 1000);
  assert.ok(3601_000 < WIDER_CONTEXT_MS);

  const [cpi] = attachEventContext([primary, at5959, at6000, at6001]).filter((row) => row.id === "cpi");
  const ids = cpi.context?.relatedEvents.map((row) => row.eventId) ?? [];
  assert.ok(ids.includes("a"));
  assert.ok(ids.includes("b"));
  assert.ok(ids.includes("c"));
  assert.equal(cpi.context?.relatedEvents.find((row) => row.eventId === "c")?.relationship.includes("NEARBY"), false);
});

test("same asset, category, currency, and cross-asset tags", () => {
  const cpi = evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] });
  const gold = evt("gold", "Gold price jumps after bullion demand", 120_000, { assets: ["gold"] });
  const sol = evt("sol", "Solana outage resolved", 180_000, { assets: ["sol"] });
  const fed = evt("fed", "FOMC holds rates steady", 60_000, { assets: ["gold", "btc", "usd"] });

  const goldRel = classifyRelationship(cpi, gold, 120);
  assert.ok(goldRel.relationship.includes("SAME_ASSET"));
  assert.ok(goldRel.sharedAssets.includes("XAUUSD"));

  const fedRel = classifyRelationship(cpi, fed, 60);
  assert.ok(fedRel.relationship.includes("SAME_CATEGORY") || fedRel.relationship.includes("SAME_MACRO_THEME"));
  assert.ok(fedRel.relationship.includes("SAME_CURRENCY"));

  const solRel = classifyRelationship(cpi, sol, 180);
  assert.ok(solRel.relationship.includes("CROSS_ASSET"));
  assert.equal(solRel.sharedAssets.length, 0);
});

test("event density counts HIGH/CRITICAL/MEDIUM inside ±60m and excludes the primary", () => {
  const events = attachEventContext([
    evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    evt("fed", "FOMC holds rates steady", 2 * 60_000, { assets: ["gold", "usd"] }),
    evt("nfp", "US payrolls miss forecasts", 10 * 60_000, { assets: ["gold", "usd"] }),
    evt("etf", "Bitcoin ETF inflows hit a record", 20 * 60_000, { assets: ["btc"] }),
    evt("weather", "Local weather delays a parade", 30 * 60_000),
    evt("far", "US CPI preview next month", 3 * 60 * 60_000, { assets: ["gold", "usd"] }),
  ]);
  const cpi = events.find((row) => row.id === "cpi");
  assert.ok(cpi?.context);
  assert.equal(cpi?.context?.eventDensity.windowMinutes, 60);
  assert.ok((cpi?.context?.eventDensity.total ?? 0) >= 2);
  assert.ok((cpi?.context?.eventDensity.critical ?? 0) >= 1);
  assert.ok(!(cpi?.context?.relatedEvents.some((row) => row.eventId === "cpi")));
});

test("ranking prefers closer same-asset events and tie-breaks by timestamp then id", () => {
  const primary = evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] });
  const later = evt("g2", "Gold bullion demand rises", 10 * 60_000, { assets: ["gold"] });
  const earlierSame = evt("g1", "Gold bullion demand rises", 10 * 60_000, { assets: ["gold"] });
  const farther = evt("g3", "Gold bullion demand rises", 40 * 60_000, { assets: ["gold"] });
  const [cpi] = attachEventContext([primary, later, earlierSame, farther]).filter((row) => row.id === "cpi");
  const ids = cpi.context?.relatedEvents.map((row) => row.eventId) ?? [];
  assert.ok(ids.indexOf("g1") < ids.indexOf("g3"));
  assert.ok(ids.indexOf("g1") < ids.indexOf("g2") || ids[0] === "g1");
});

test("maximum 10 related events with deterministic order", () => {
  const extras = Array.from({ length: 15 }, (_, i) =>
    evt(`x${String(i).padStart(2, "0")}`, "Gold bullion demand rises", (i + 1) * 60_000, { assets: ["gold"] }),
  );
  const [cpi] = attachEventContext([
    evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    ...extras,
  ]).filter((row) => row.id === "cpi");
  assert.equal(MAX_RELATED_EVENTS, 10);
  assert.equal(cpi.context?.relatedEvents.length, 10);
  const first = attachEventContext([
    evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    ...extras,
  ]).find((row) => row.id === "cpi");
  assert.deepEqual(cpi.context?.relatedEvents, first?.context?.relatedEvents);
});

test("primary is excluded and already-deduped ids are unique", () => {
  const a = evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] });
  const b = evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] });
  const c = evt("fed", "FOMC holds rates steady", 120_000, { assets: ["gold", "usd"] });
  const [primary] = attachEventContext([a, b, c]).filter((row) => row.id === "cpi");
  const ids = primary.context?.relatedEvents.map((row) => row.eventId) ?? [];
  assert.ok(!ids.includes("cpi"));
  assert.equal(new Set(ids).size, ids.length);
});

test("missing market reaction is PARTIAL/unavailable, never zeroed", () => {
  const events = attachEventContext([
    evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    evt("fed", "FOMC holds rates steady", 120_000, { assets: ["gold", "usd"] }),
  ]);
  const cpi = events.find((row) => row.id === "cpi");
  assert.equal(cpi?.context?.marketContext.status, "UNAVAILABLE");
  assert.equal(Object.keys(cpi?.context?.marketContext.assets ?? {}).length, 0);
  assert.equal(cpi?.context?.status, "PARTIAL");
});

test("market context reuses Phase 3.2 reaction without fabricating moves", () => {
  const cpi = evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] });
  cpi.marketReaction = reaction();
  const [out] = attachEventContext([
    cpi,
    evt("fed", "FOMC holds rates steady", 120_000, { assets: ["gold", "usd"] }),
  ]).filter((row) => row.id === "cpi");
  assert.equal(out.context?.marketContext.status, "AVAILABLE");
  assert.equal(out.context?.marketContext.assets.XAUUSD?.postEvent15mReturnPercent, -0.71);
  assert.equal(out.context?.marketContext.assets.XAUUSD?.postEventDirection, "DOWN");
  assert.equal(out.context?.marketContext.assets.XAUUSD?.preEventReturnPercent, 0.18);
});

test("unavailable context when timestamp is missing", () => {
  const orphan = evt("x", "US CPI rises more than expected", 0, { assets: ["gold"] });
  orphan.publishedAt = null;
  orphan.intelligence = analyzeEvent(orphan, NOW);
  const [out] = attachEventContext([orphan]);
  assert.equal(out.context?.status, "UNAVAILABLE");
  assert.equal(out.context?.relatedEvents.length, 0);
});

test("engine output contains no causal language", () => {
  const events = attachEventContext([
    evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    evt("fed", "FOMC holds rates steady", 120_000, { assets: ["gold", "usd"] }),
  ]);
  const blob = JSON.stringify(events.map((row) => row.context));
  assert.doesNotMatch(blob, /caused|explains the move|because of|buy|sell|forecast|bullish|bearish/i);
});

test("scenario quiet vs simultaneous vs crowded vs cross-asset vs duplicates", () => {
  const quiet = attachEventContext([evt("only", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] })]);
  assert.equal(quiet[0]?.context?.relatedEvents.length, 0);
  assert.equal(quiet[0]?.context?.eventDensity.total, 0);

  const simultaneous = attachEventContext([
    evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    evt("nfp", "US payrolls miss forecasts", 60_000, { assets: ["gold", "usd"] }),
  ]);
  const rel = simultaneous.find((row) => row.id === "cpi")?.context?.relatedEvents[0];
  assert.ok(rel?.relationship.includes("SIMULTANEOUS"));

  const crowded = attachEventContext([
    evt("cpi", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    evt("fed", "FOMC holds rates steady", 2 * 60_000, { assets: ["gold", "usd"] }),
    evt("nfp", "US payrolls miss forecasts", 8 * 60_000, { assets: ["gold", "usd"] }),
    evt("etf", "Bitcoin ETF inflows hit a record", 12 * 60_000, { assets: ["btc"] }),
    evt("reg", "SEC files crypto regulation proposal", 15 * 60_000, { assets: ["btc"] }),
  ]);
  assert.ok((crowded.find((row) => row.id === "cpi")?.context?.eventDensity.total ?? 0) >= 3);

  const duped = attachEventContext([
    evt("same", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
    evt("same", "US CPI rises more than expected", 0, { assets: ["gold", "usd"] }),
  ]);
  assert.equal(duped[0]?.context?.relatedEvents.length, 0);
});

test("large event set stays deterministic and bounded", () => {
  const many = Array.from({ length: 800 }, (_, i) =>
    evt(`e${i}`, i % 3 === 0 ? "US CPI rises more than expected" : "Gold bullion demand rises", i * 30_000, {
      assets: ["gold"],
    }),
  );
  const started = Date.now();
  const first = attachEventContext(many);
  const elapsed = Date.now() - started;
  const second = attachEventContext(many);
  assert.deepEqual(first[0]?.context, second[0]?.context);
  assert.ok((first[10]?.context?.relatedEvents.length ?? 0) <= 10);
  assert.ok(elapsed < 1000, `expected <1s, took ${elapsed}ms`);
});

test("rank points are deterministic for identical inputs", () => {
  assert.equal(rankValue(120, 1, true, true, true, "HIGH"), rankValue(120, 1, true, true, true, "HIGH"));
  assert.ok(rankValue(60, 1, true, true, true, "CRITICAL") > rankValue(4000, 0, false, false, false, "LOW"));
});
