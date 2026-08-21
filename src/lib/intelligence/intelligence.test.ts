import assert from "node:assert/strict";
import { test } from "node:test";
import type { CatalystEvent } from "../../types/catalyst";
import { SCORE_WEIGHTS } from "./config";
import {
  analyzeEvent,
  assetRelevance,
  catalystScore,
  classifyEvent,
  enrichWithIntelligence,
  importanceOf,
  marketSensitivityOf,
  recencyOf,
  sourceConfidenceOf,
} from "./engine";
import { createMemoryNewsCache } from "../news/cache";
import { createNewsService } from "../news/service";
import type { NewsProvider } from "../news/provider";

const NOW = Date.parse("2026-08-19T12:00:00.000Z");

function evt(partial: Partial<CatalystEvent> & Pick<CatalystEvent, "title">): CatalystEvent {
  return {
    id: partial.id ?? "evt_test",
    summary: "",
    source: "Reuters",
    sourceUrl: "https://example.com/a",
    sourceUrls: ["https://example.com/a"],
    publishedAt: "2026-08-19T11:40:00.000Z",
    fetchedAt: "2026-08-19T12:00:00.000Z",
    assets: [],
    categories: [],
    impact: null,
    sourceStatus: "live",
    providers: ["gdelt"],
    ...partial,
  };
}

test("EVENT IDENTITY preserves title, source, urls, timestamps and stable ids", () => {
  const event = evt({
    id: "evt_abc123",
    title: "US CPI rises more than expected",
    source: "reuters.com",
    sourceUrl: "https://reuters.com/cpi",
    publishedAt: "2026-08-19T14:15:00.000Z",
    fetchedAt: "2026-08-19T14:20:00.000Z",
  });
  const intel = analyzeEvent(event, NOW);
  assert.equal(intel.identity.eventId, "evt_abc123");
  assert.equal(intel.identity.title, "US CPI rises more than expected");
  assert.equal(intel.identity.source, "reuters.com");
  assert.equal(intel.identity.sourceUrl, "https://reuters.com/cpi");
  assert.equal(intel.identity.publishedAt, "2026-08-19T14:15:00.000Z");
  assert.equal(intel.identity.detectedAt, "2026-08-19T14:20:00.000Z");
  assert.equal(intel.identity.eventType, "INFLATION");
});

test("EVENT IDENTITY does not invent missing timestamps", () => {
  const event = evt({ title: "Untitled print", publishedAt: null, fetchedAt: "2026-08-19T12:00:00.000Z" });
  const intel = analyzeEvent(event, NOW);
  assert.equal(intel.identity.publishedAt, null);
  assert.equal(intel.identity.detectedAt, "2026-08-19T12:00:00.000Z");
});

test("CLASSIFICATION maps CPI, FOMC, ETF, regulation, geopolitical, crypto, unknown", () => {
  assert.deepEqual(classifyEvent(evt({ title: "US CPI rises more than expected" })), ["INFLATION", "MACRO"]);
  assert.ok(classifyEvent(evt({ title: "FOMC holds rates steady" })).includes("CENTRAL_BANK"));
  assert.ok(classifyEvent(evt({ title: "FOMC holds rates steady" })).includes("INTEREST_RATE"));
  assert.ok(classifyEvent(evt({ title: "Bitcoin ETF inflows hit a record" })).includes("ETF"));
  assert.ok(classifyEvent(evt({ title: "SEC files crypto regulation proposal" })).includes("REGULATION"));
  assert.ok(classifyEvent(evt({ title: "Geopolitical conflict escalates in the region" })).includes("GEOPOLITICAL"));
  assert.ok(classifyEvent(evt({ title: "Solana outage resolved" })).includes("CRYPTO"));
  assert.deepEqual(classifyEvent(evt({ title: "Local weather delays a parade" })), ["OTHER"]);
});

test("ASSET RELEVANCE scores Gold, BTC, multi-asset macro, and unrelated events", () => {
  const gold = assetRelevance(evt({ title: "Gold rises after hotter US CPI print", assets: ["gold", "usd"] }), [
    "INFLATION",
    "MACRO",
  ]);
  assert.ok(gold.find((row) => row.symbol === "XAUUSD")!.relevance >= 0.88);
  assert.ok(gold.find((row) => row.symbol === "USD")!.relevance >= 0.9);

  const btc = assetRelevance(evt({ title: "Bitcoin ETF inflows hit a record", assets: ["btc"] }), ["ETF", "CRYPTO"]);
  assert.ok(btc.find((row) => row.symbol === "BTC")!.relevance >= 0.9);

  const macro = assetRelevance(evt({ title: "FOMC holds rates steady", assets: ["gold", "btc", "usd"] }), [
    "CENTRAL_BANK",
    "INTEREST_RATE",
  ]);
  assert.ok(macro.some((row) => row.symbol === "XAUUSD"));
  assert.ok(macro.some((row) => row.symbol === "USD"));
  assert.ok(macro.some((row) => row.symbol === "BTC"));

  const unrelated = assetRelevance(evt({ title: "Local weather delays a parade" }), ["OTHER"]);
  assert.equal(unrelated.length, 0);
});

test("IMPORTANCE tiers are deterministic and explainable", () => {
  const fomc = evt({ title: "FOMC holds rates steady", assets: ["gold", "btc", "usd"] });
  const fomcImp = importanceOf(fomc, assetRelevance(fomc, classifyEvent(fomc)));
  assert.equal(fomcImp.tier, "CRITICAL");
  assert.ok(fomcImp.reasons.length > 0);

  const cpi = evt({ title: "US CPI rises more than expected" });
  assert.equal(importanceOf(cpi, assetRelevance(cpi, classifyEvent(cpi))).tier, "HIGH");

  const etf = evt({ title: "Bitcoin ETF inflows hit a record" });
  assert.equal(importanceOf(etf, assetRelevance(etf, classifyEvent(etf))).tier, "HIGH");

  const crypto = evt({ title: "Solana outage resolved" });
  assert.equal(importanceOf(crypto, assetRelevance(crypto, classifyEvent(crypto))).tier, "MEDIUM");

  const minor = evt({ title: "Local weather delays a parade" });
  assert.equal(importanceOf(minor, []).tier, "LOW");
});

test("SOURCE CONFIDENCE counts independent providers and not duplicate ids", () => {
  const single = sourceConfidenceOf(evt({ title: "US CPI", providers: ["gdelt"] }));
  assert.equal(single.confirmationCount, 1);
  assert.ok(single.score < 0.9);

  const multi = sourceConfidenceOf(evt({ title: "US CPI", providers: ["gdelt", "sosovalue"] }));
  assert.equal(multi.confirmationCount, 2);
  assert.ok(multi.score > single.score);
  assert.equal(multi.tier, "VERY_HIGH");

  const dup = sourceConfidenceOf(evt({ title: "US CPI", providers: ["gdelt", "gdelt"] }));
  assert.equal(dup.confirmationCount, 1);

  const empty = sourceConfidenceOf(evt({ title: "US CPI", providers: [] }));
  assert.equal(empty.confirmationCount, 1);
});

test("RECENCY windows match the configured ages", () => {
  const types: never[] = [];
  const at = (iso: string) => recencyOf(evt({ title: "US CPI", publishedAt: iso }), types, NOW);

  assert.equal(at("2026-08-19T11:58:00.000Z").tier, "VERY_FRESH");
  assert.equal(at("2026-08-19T11:40:00.000Z").tier, "FRESH");
  assert.equal(at("2026-08-19T11:00:00.000Z").tier, "RECENT");
  assert.equal(at("2026-08-19T07:00:00.000Z").tier, "AGING");
  assert.equal(at("2026-08-19T00:00:00.000Z").tier, "OLD");
  assert.equal(at("2026-08-18T06:00:00.000Z").tier, "ARCHIVE");
});

test("MARKET SENSITIVITY is potential-only and has no direction", () => {
  const fomc = evt({ title: "FOMC holds rates steady", assets: ["gold", "btc", "usd"] });
  const fomcTypes = classifyEvent(fomc);
  const fomcSense = marketSensitivityOf(fomc, fomcTypes, assetRelevance(fomc, fomcTypes));
  assert.equal(fomcSense.USD, 0.95);
  assert.equal(fomcSense.XAUUSD, 0.9);
  assert.equal(fomcSense.BTC, 0.6);

  const cpi = evt({ title: "US CPI rises more than expected", assets: ["gold", "usd"] });
  const cpiTypes = classifyEvent(cpi);
  const cpiSense = marketSensitivityOf(cpi, cpiTypes, assetRelevance(cpi, cpiTypes));
  assert.ok((cpiSense.USD ?? 0) >= 0.85);
  assert.ok((cpiSense.XAUUSD ?? 0) >= 0.8);

  const etf = evt({ title: "Bitcoin ETF inflows hit a record", assets: ["btc"] });
  const etfTypes = classifyEvent(etf);
  const etfSense = marketSensitivityOf(etf, etfTypes, assetRelevance(etf, etfTypes));
  assert.ok((etfSense.BTC ?? 0) >= 0.9);

  const crypto = evt({ title: "Solana outage resolved", assets: ["sol"] });
  const cryptoTypes = classifyEvent(crypto);
  const cryptoSense = marketSensitivityOf(crypto, cryptoTypes, assetRelevance(crypto, cryptoTypes));
  assert.ok((cryptoSense.SOL ?? 0) > 0);

  const geo = evt({ title: "Geopolitical conflict escalates in the region", assets: ["gold"] });
  const geoTypes = classifyEvent(geo);
  const geoSense = marketSensitivityOf(geo, geoTypes, assetRelevance(geo, geoTypes));
  assert.ok((geoSense.XAUUSD ?? 0) >= 0.8);

  const serialized = JSON.stringify(analyzeEvent(fomc, NOW));
  assert.doesNotMatch(serialized, /bullish|bearish|buy|sell|will rise|will dump/i);
});

test("CATALYST SCORE math, bounds, missing data, and repeatability", () => {
  assert.equal(
    SCORE_WEIGHTS.importance +
      SCORE_WEIGHTS.assetRelevance +
      SCORE_WEIGHTS.sourceConfidence +
      SCORE_WEIGHTS.recency +
      SCORE_WEIGHTS.marketSensitivity,
    1,
  );

  const zero = catalystScore({
    importance: 0,
    assetRelevance: 0,
    sourceConfidence: 0,
    recency: 0,
    marketSensitivity: 0,
  });
  assert.equal(zero.overall, 0);

  const full = catalystScore({
    importance: 1,
    assetRelevance: 1,
    sourceConfidence: 1,
    recency: 1,
    marketSensitivity: 1,
  });
  assert.equal(full.overall, 100);

  const event = evt({ title: "US CPI rises more than expected", assets: ["gold", "usd"], providers: ["fred"] });
  const first = analyzeEvent(event, NOW);
  const second = analyzeEvent(event, NOW);
  assert.deepEqual(first, second);
  assert.ok(first.score.overall >= 0 && first.score.overall <= 100);
  assert.equal(typeof first.score.components.importance, "number");

  const missing = analyzeEvent(evt({ title: "Local weather delays a parade", publishedAt: null, assets: [] }), NOW);
  assert.equal(missing.assets.length, 0);
  assert.equal(missing.score.components.assetRelevance, 0);
  assert.ok(missing.score.overall >= 0);
});

test("enrichWithIntelligence is attached by the news service and never crashes", async () => {
  const provider: NewsProvider = {
    id: "gdelt",
    label: "GDELT",
    ttlMs: 1_000,
    staleMs: 10_000,
    fetchItems: async () => ({
      ok: true,
      items: [
        {
          providerId: "gdelt",
          providerItemId: "https://news.example/cpi",
          title: "US CPI rises more than expected",
          summary: "",
          sourceName: "Reuters",
          url: "https://news.example/cpi",
          publishedAt: "2026-08-19T11:40:00.000Z",
          raw: null,
        },
      ],
    }),
  };
  const feed = await createNewsService({
    providers: [provider],
    cache: createMemoryNewsCache(),
    now: () => NOW,
  }).getFeed();
  assert.equal(feed.status, "live");
  assert.ok(feed.events[0]?.intelligence);
  assert.ok(feed.events[0]?.intelligence?.classification.types.includes("INFLATION"));
  assert.equal(feed.events[0]?.impact, null);

  const guarded = enrichWithIntelligence(evt({ title: "US CPI rises more than expected" }), NOW);
  assert.ok(guarded.intelligence);
});
