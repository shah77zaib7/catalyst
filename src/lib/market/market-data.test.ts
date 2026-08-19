import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryQuoteCache } from "./cache";
import { normalizeTwelveDataQuote } from "./normalize";
import { createMarketService } from "./service";
import { createTwelveDataProvider } from "./providers/twelve-data";
import type { MarketDataProvider, ProviderResult } from "./provider";
import type { Asset } from "../../types/catalyst";

const SECRET = "td_test_secret_do_not_leak_123";

const SAMPLE = {
  gold: {
    symbol: "XAU/USD",
    currency: "USD",
    close: "2345.12000",
    open: "2330.00000",
    high: "2350.50000",
    low: "2328.10000",
    previous_close: "2333.00000",
    change: "12.12000",
    percent_change: "0.51950",
    timestamp: 1_700_000_000,
  },
  bitcoin: {
    symbol: "BTC/USD",
    currency: "USD",
    close: 67500.25,
    change: -120.5,
    percent_change: -0.178,
    timestamp: 1_700_000_100,
  },
  ethereum: {
    symbol: "ETH/USD",
    currency: "USD",
    close: "3450.80",
    change: "20.10",
    percent_change: "0.586",
    timestamp: 1_700_000_200,
  },
  solana: {
    symbol: "SOL/USD",
    currency: "USD",
    close: "148.22",
    change: "3.40",
    percent_change: "2.348",
    timestamp: 1_700_000_300,
  },
} as const;

function payloadProvider(
  impl: (symbol: string) => ProviderResult | Promise<ProviderResult>,
): MarketDataProvider {
  return {
    id: "twelve-data",
    getQuote: (symbol) => Promise.resolve(impl(symbol)),
  };
}

test("successful Twelve Data response normalizes to LIVE", async () => {
  const service = createMarketService({
    provider: payloadProvider(() => ({ ok: true, symbol: "XAU/USD", payload: SAMPLE.gold })),
    cache: createMemoryQuoteCache(),
    now: () => 1_000,
  });

  const [quote] = await service.getQuotes(["gold"]);
  assert.equal(quote.sourceStatus, "live");
  assert.equal(quote.price, 2345.12);
  assert.equal(quote.change24h, 12.12);
  assert.equal(quote.changePercent24h, 0.5195);
  assert.equal(quote.open, 2330);
  assert.equal(quote.high, 2350.5);
  assert.equal(quote.low, 2328.1);
  assert.equal(quote.previousClose, 2333);
  assert.equal(quote.symbol, "XAU/USD");
  assert.equal(quote.timestamp, "2023-11-14T22:13:20.000Z");
  assert.equal(quote.source, "twelve-data");
});

test("provider failure with valid cache returns CACHED, never LIVE", async () => {
  let calls = 0;
  const service = createMarketService({
    provider: payloadProvider((symbol) => {
      calls += 1;
      if (calls === 1) return { ok: true, symbol, payload: SAMPLE.bitcoin };
      return { ok: false, symbol, kind: "provider_error", message: "upstream down" };
    }),
    cache: createMemoryQuoteCache(),
    ttlMs: 10,
    staleMs: 10_000,
    now: () => (calls === 0 ? 0 : 1_000),
  });

  const first = await service.getQuotes(["bitcoin"]);
  assert.equal(first[0].sourceStatus, "live");

  const second = await service.getQuotes(["bitcoin"]);
  assert.equal(second[0].sourceStatus, "cached");
  assert.equal(second[0].price, 67500.25);
  assert.notEqual(second[0].sourceStatus, "live");
});

test("fresh cache hit is labeled CACHED and skips the provider", async () => {
  let calls = 0;
  const service = createMarketService({
    provider: payloadProvider((symbol) => {
      calls += 1;
      return { ok: true, symbol, payload: SAMPLE.ethereum };
    }),
    cache: createMemoryQuoteCache(),
    ttlMs: 5_000,
    now: () => 100,
  });

  await service.getQuotes(["ethereum"]);
  const again = await service.getQuotes(["ethereum"]);
  assert.equal(calls, 1);
  assert.equal(again[0].sourceStatus, "cached");
  assert.equal(again[0].price, 3450.8);
});

test("provider failure with no cache returns UNAVAILABLE and null prices", async () => {
  const service = createMarketService({
    provider: payloadProvider((symbol) => ({
      ok: false,
      symbol,
      kind: "network",
      message: "timeout",
    })),
    cache: createMemoryQuoteCache(),
  });

  const [quote] = await service.getQuotes(["solana"]);
  assert.equal(quote.sourceStatus, "unavailable");
  assert.equal(quote.price, null);
  assert.equal(quote.change24h, null);
  assert.equal(quote.changePercent24h, null);
});

test("missing API key fails closed as UNAVAILABLE", async () => {
  const provider = createTwelveDataProvider({ apiKey: "" });
  const result = await provider.getQuote("XAU/USD");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.kind, "missing_key");

  const service = createMarketService({
    provider,
    cache: createMemoryQuoteCache(),
  });
  const [quote] = await service.getQuotes(["gold"]);
  assert.equal(quote.sourceStatus, "unavailable");
  assert.equal(quote.price, null);
});

test("malformed provider response is UNAVAILABLE", async () => {
  const service = createMarketService({
    provider: payloadProvider((symbol) => ({
      ok: true,
      symbol,
      payload: { symbol: "XAU/USD", status: "ok" },
    })),
    cache: createMemoryQuoteCache(),
  });
  const [quote] = await service.getQuotes(["gold"]);
  assert.equal(quote.sourceStatus, "unavailable");
  assert.equal(quote.price, null);
  assert.equal(normalizeTwelveDataQuote("gold", { close: "nope" }, "live", "twelve-data"), null);
});

test("rate-limit and invalid-key failures are UNAVAILABLE without numbers", async () => {
  for (const kind of ["rate_limit", "invalid_key"] as const) {
    const service = createMarketService({
      provider: payloadProvider((symbol) => ({
        ok: false,
        symbol,
        kind,
        message: kind,
      })),
      cache: createMemoryQuoteCache(),
    });
    const [quote] = await service.getQuotes(["gold"]);
    assert.equal(quote.sourceStatus, "unavailable");
    assert.equal(quote.price, null);
  }

  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ status: "error", code: 429, message: "API request limit reached" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  const limited = createTwelveDataProvider({ apiKey: SECRET, fetchImpl });
  const limitedResult = await limited.getQuote("BTC/USD");
  assert.equal(limitedResult.ok, false);
  if (!limitedResult.ok) assert.equal(limitedResult.kind, "rate_limit");
});

test("API key never appears in returned data or logs", async () => {
  const messages: string[] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    messages.push(args.map(String).join(" "));
  };

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    assert.doesNotMatch(url, new RegExp(SECRET));
    assert.doesNotMatch(url, /apikey=/i);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), `apikey ${SECRET}`);
    return new Response(JSON.stringify(SAMPLE.gold), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const provider = createTwelveDataProvider({ apiKey: SECRET, fetchImpl });
    const service = createMarketService({ provider, cache: createMemoryQuoteCache() });
    const quotes = await service.getQuotes(["gold"]);
    const serialized = JSON.stringify({ quotes, logs: messages, snapshot: service.getSnapshot() });
    assert.doesNotMatch(serialized, new RegExp(SECRET));
    assert.equal(quotes[0].sourceStatus, "live");
  } finally {
    console.info = original;
  }
});

test("all four instruments normalize correctly", async () => {
  const service = createMarketService({
    provider: payloadProvider((symbol) => {
      const asset = (Object.keys(SAMPLE) as Asset[]).find(
        (key) => SAMPLE[key].symbol === symbol,
      );
      if (!asset) {
        return { ok: false, symbol, kind: "unavailable_symbol", message: "unknown" };
      }
      return { ok: true, symbol, payload: SAMPLE[asset] };
    }),
    cache: createMemoryQuoteCache(),
  });

  const quotes = await service.getQuotes(["gold", "bitcoin", "ethereum", "solana"]);
  assert.equal(quotes.length, 4);
  assert.deepEqual(
    quotes.map((quote) => [quote.asset, quote.symbol, quote.sourceStatus, quote.price != null]),
    [
      ["gold", "XAU/USD", "live", true],
      ["bitcoin", "BTC/USD", "live", true],
      ["ethereum", "ETH/USD", "live", true],
      ["solana", "SOL/USD", "live", true],
    ],
  );
  assert.equal(quotes[1].change24h, -120.5);
  assert.equal(quotes[3].changePercent24h, 2.348);
});
