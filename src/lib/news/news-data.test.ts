import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyText } from "./assets";
import { createMemoryNewsCache } from "./cache";
import { clusterEvents } from "./dedupe";
import { canonicalizeUrl, normalizeRawItem, parseIsoDate } from "./normalize";
import { createNewsService } from "./service";
import { createAlphaVantageProvider } from "./providers/alpha-vantage";
import { createCoinGeckoProvider } from "./providers/coingecko";
import { createFredProvider, isRelevantFredRelease } from "./providers/fred";
import { createGdeltProvider } from "./providers/gdelt";
import type { CatalystEvent } from "../../types/catalyst";
import type { NewsProvider, RawNewsItem } from "./provider";

const SECRET = "news_test_secret_do_not_leak_999";

function raw(partial: Partial<RawNewsItem> & Pick<RawNewsItem, "title" | "url">): RawNewsItem {
  return {
    providerId: partial.providerId ?? "gdelt",
    providerItemId: partial.providerItemId ?? partial.url,
    title: partial.title,
    summary: partial.summary ?? "",
    sourceName: partial.sourceName ?? "Reuters",
    url: partial.url,
    publishedAt: partial.publishedAt ?? "2026-08-19T12:00:00.000Z",
    raw: null,
  };
}

function eventFrom(partial: Partial<CatalystEvent> & Pick<CatalystEvent, "id" | "title" | "sourceUrl">): CatalystEvent {
  return {
    summary: "",
    source: "test",
    sourceUrls: [partial.sourceUrl],
    publishedAt: "2026-08-19T12:00:00.000Z",
    fetchedAt: "2026-08-19T12:05:00.000Z",
    assets: [],
    categories: [],
    impact: null,
    sourceStatus: "live",
    providers: ["gdelt"],
    ...partial,
  };
}

function staticProvider(id: string, result: Awaited<ReturnType<NewsProvider["fetchItems"]>>): NewsProvider {
  return {
    id,
    label: id,
    ttlMs: 1_000,
    staleMs: 10_000,
    fetchItems: async () => result,
  };
}

test("GDELT articles normalize without invented fields", () => {
  const event = normalizeRawItem(
    raw({
      title: "Gold rises after hotter US CPI print",
      url: "https://www.reuters.com/markets/gold-cpi?utm_source=rss",
      sourceName: "reuters.com",
      publishedAt: parseIsoDate("20260819T141500Z"),
    }),
    "live",
    "2026-08-19T14:20:00.000Z",
  );
  assert.ok(event);
  assert.equal(event?.title, "Gold rises after hotter US CPI print");
  assert.equal(event?.summary, "");
  assert.equal(event?.impact, null);
  assert.equal(event?.sourceStatus, "live");
  assert.equal(event?.publishedAt, "2026-08-19T14:15:00.000Z");
  assert.ok(event?.assets.includes("gold"));
  assert.ok(event?.assets.includes("usd"));
  assert.ok(event?.categories.includes("macro"));
  assert.doesNotMatch(event?.sourceUrl ?? "", /utm_source/);
});

test("asset mapping is deterministic", () => {
  assert.deepEqual(classifyText("FOMC holds rates steady").assets.sort(), ["btc", "gold", "usd"]);
  assert.ok(classifyText("FOMC holds rates steady").categories.includes("central-banks"));
  assert.deepEqual(classifyText("Bitcoin ETF inflows hit a record").assets, ["btc"]);
  assert.deepEqual(classifyText("Ethereum developers delay upgrade").assets, ["eth"]);
  assert.deepEqual(classifyText("Solana outage resolved").assets, ["sol"]);
  assert.deepEqual(classifyText("Geopolitical conflict escalates in the region").assets, ["gold"]);
  assert.ok(classifyText("Oil shock after OPEC cut").assets.includes("gold"));
  assert.ok(classifyText("Oil shock after OPEC cut").assets.includes("usd"));
  assert.deepEqual(classifyText("Local weather delays a parade").assets, []);
});

test("duplicate URL and exact title cluster; similar titles stay distinct", () => {
  const first = eventFrom({
    id: "a",
    title: "Fed signals slower cuts",
    sourceUrl: "https://example.com/fed?utm_medium=email",
    providers: ["gdelt"],
  });
  const sameUrl = eventFrom({
    id: "b",
    title: "Fed signals slower cuts",
    sourceUrl: "https://example.com/fed",
    providers: ["alpha-vantage"],
    source: "Bloomberg",
  });
  const sameTitle = eventFrom({
    id: "c",
    title: "Fed signals slower cuts!",
    sourceUrl: "https://other.com/fed-cuts",
    providers: ["coingecko"],
  });
  const distinct = eventFrom({
    id: "d",
    title: "Fed officials disagree on the path of cuts",
    sourceUrl: "https://other.com/disagreement",
  });

  const clustered = clusterEvents([first, sameUrl, sameTitle, distinct]);
  assert.equal(clustered.length, 2);
  const merged = clustered.find((item) => item.title.startsWith("Fed signals"));
  assert.ok(merged);
  assert.equal(merged?.sourceUrls.length, 2);
  assert.ok(merged?.providers.includes("gdelt"));
  assert.ok(merged?.providers.includes("alpha-vantage"));
  assert.ok(merged?.providers.includes("coingecko"));
  assert.ok(clustered.some((item) => item.title.includes("disagree")));
});

test("missing API keys fail closed", async () => {
  const cg = await createCoinGeckoProvider({ apiKey: "" }).fetchItems();
  const fred = await createFredProvider({ apiKey: "" }).fetchItems();
  const av = await createAlphaVantageProvider({ apiKey: "" }).fetchItems();
  assert.equal(cg.ok, false);
  assert.equal(fred.ok, false);
  assert.equal(av.ok, false);
  if (!cg.ok) assert.equal(cg.kind, "missing_key");
  if (!fred.ok) assert.equal(fred.kind, "missing_key");
  if (!av.ok) assert.equal(av.kind, "missing_key");
});

test("provider failure with no cache yields an empty UNAVAILABLE feed", async () => {
  const service = createNewsService({
    providers: [staticProvider("gdelt", { ok: false, kind: "network", message: "down" })],
    cache: createMemoryNewsCache(),
  });
  const feed = await service.getFeed();
  assert.equal(feed.status, "unavailable");
  assert.equal(feed.events.length, 0);
});

test("provider failure with valid cache returns CACHED, never LIVE", async () => {
  let calls = 0;
  const provider: NewsProvider = {
    id: "gdelt",
    label: "GDELT",
    ttlMs: 10,
    staleMs: 10_000,
    async fetchItems() {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          items: [raw({ title: "Bitcoin ETF news arrives", url: "https://news.example/btc-etf" })],
        };
      }
      return { ok: false, kind: "rate_limit", message: "slow down" };
    },
  };
  const service = createNewsService({
    providers: [provider],
    cache: createMemoryNewsCache(),
    now: () => (calls === 0 ? 0 : 1_000),
  });

  const live = await service.getFeed();
  assert.equal(live.status, "live");
  assert.equal(live.events[0]?.sourceStatus, "live");

  const cached = await service.getFeed();
  assert.equal(cached.status, "cached");
  assert.equal(cached.events[0]?.sourceStatus, "cached");
  assert.notEqual(cached.events[0]?.sourceStatus, "live");
  assert.equal(cached.events[0]?.title, "Bitcoin ETF news arrives");
});

test("malformed provider payloads do not invent events", async () => {
  const gdelt = createGdeltProvider({
    fetchImpl: async () => new Response("<html>nope</html>", { status: 200 }),
  });
  const result = await gdelt.fetchItems();
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.kind, "malformed");

  const service = createNewsService({
    providers: [staticProvider("gdelt", { ok: true, items: [raw({ title: "", url: "" })] })],
    cache: createMemoryNewsCache(),
  });
  const feed = await service.getFeed();
  assert.equal(feed.events.length, 0);
});

test("API keys never appear in returned data", async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    assert.doesNotMatch(url, /apikey=/i);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("x-cg-demo-api-key"), SECRET);
    return Response.json({
      data: [
        {
          title: "Solana network status",
          url: "https://news.example/sol",
          description: "Validators restored consensus.",
          news_site: "CoinGecko",
          updated_at: "2026-08-19T10:00:00Z",
        },
      ],
    });
  };

  const provider = createCoinGeckoProvider({ apiKey: SECRET, fetchImpl });
  const service = createNewsService({ providers: [provider], cache: createMemoryNewsCache() });
  const feed = await service.getFeed();
  const serialized = JSON.stringify(feed);
  assert.doesNotMatch(serialized, new RegExp(SECRET));
  assert.equal(feed.events[0]?.assets.includes("sol"), true);
});

test("CoinGecko official news array normalizes to LIVE", async () => {
  const provider = createCoinGeckoProvider({
    apiKey: SECRET,
    fetchImpl: async () =>
      Response.json([
        {
          title: "Bitcoin ETF inflows hit a record",
          url: "https://www.coindesk.com/btc-etf",
          author: "Desk",
          source_name: "CoinDesk",
          posted_at: "2026-08-19T09:30:00Z",
          type: "news",
          image: "https://example.com/a.png",
        },
      ]),
  });
  const result = await provider.fetchItems();
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items[0]?.title, "Bitcoin ETF inflows hit a record");
    assert.equal(result.items[0]?.sourceName, "CoinDesk");
    assert.equal(result.items[0]?.publishedAt, "2026-08-19T09:30:00.000Z");
    assert.doesNotMatch(JSON.stringify(result.items), new RegExp(SECRET));
  }
});

test("CoinGecko Demo /news plan lock falls back to trending coverage", async () => {
  const seen: string[] = [];
  const provider = createCoinGeckoProvider({
    apiKey: SECRET,
    fetchImpl: async (input, init) => {
      const url = String(input);
      seen.push(url);
      const headers = new Headers(init?.headers);
      assert.ok(headers.get("x-cg-demo-api-key") === SECRET || headers.get("x-cg-pro-api-key") === SECRET);
      assert.doesNotMatch(url, new RegExp(SECRET));
      if (url.includes("/news")) {
        return Response.json(
          { status: { error_code: 10011, error_message: "This request is exclusive to paid subscribers" } },
          { status: 400 },
        );
      }
      return Response.json({
        coins: [
          {
            item: { id: "bitcoin", name: "Bitcoin", symbol: "btc", market_cap_rank: 1 },
          },
        ],
      });
    },
  });
  const result = await provider.fetchItems();
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items[0]?.title, "Bitcoin");
    assert.equal(result.items[0]?.url, "https://www.coingecko.com/en/coins/bitcoin");
    assert.match(result.items[0]?.summary ?? "", /BTC/);
  }
  assert.ok(seen.some((url) => url.includes("/search/trending")));
});

test("FRED keep-list is deterministic and Alpha Vantage maps timestamps", async () => {
  assert.equal(isRelevantFredRelease("Consumer Price Index"), true);
  assert.equal(isRelevantFredRelease("Weekly Seasonal Factors"), false);

  const av = createAlphaVantageProvider({
    apiKey: SECRET,
    fetchImpl: async () =>
      Response.json({
        feed: [
          {
            title: "Treasury yields jump",
            url: "https://av.example/ust",
            summary: "Bond market reaction.",
            source: "AV Wire",
            time_published: "20260819T090000",
          },
        ],
      }),
  });
  // Alpha Vantage requires the key in the query string. The adapter must still
  // omit it from any thrown/returned message.
  const result = await av.fetchItems();
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.items[0]?.publishedAt, "2026-08-19T09:00:00.000Z");
    assert.doesNotMatch(JSON.stringify(result.items), new RegExp(SECRET));
  }
});

test("one failed provider does not block another", async () => {
  const service = createNewsService({
    providers: [
      staticProvider("gdelt", { ok: false, kind: "network", message: "down" }),
      staticProvider("fred", {
        ok: true,
        items: [raw({ providerId: "fred", title: "Consumer Price Index", url: "https://fred.stlouisfed.org/release?rid=10" })],
      }),
    ],
    cache: createMemoryNewsCache(),
  });
  const feed = await service.getFeed();
  assert.equal(feed.events.length, 1);
  assert.equal(feed.status, "live");
  assert.equal(feed.providers.find((item) => item.label === "gdelt")?.sourceStatus, "unavailable");
});

test("canonicalizeUrl strips tracking params", () => {
  assert.equal(
    canonicalizeUrl("https://WWW.Example.com/a/?utm_source=x&id=1"),
    "https://www.example.com/a?id=1",
  );
});
