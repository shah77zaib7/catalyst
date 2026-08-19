import { classifyHttp, fetchJson } from "../http";
import { parseIsoDate } from "../normalize";
import type { NewsProvider, NewsProviderFailureKind, NewsProviderResult, RawNewsItem } from "../provider";

export const COINGECKO_TTL_MS = 10 * 60 * 1000;
export const COINGECKO_STALE_MS = 60 * 60 * 1000;

const DEMO_BASE = "https://api.coingecko.com/api/v3";
const PRO_BASE = "https://pro-api.coingecko.com/api/v3";
const USER_AGENT = "CatalystMarketIntelligence/1.0";

export type CoinGeckoEnv = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

function coinGeckoError(payload: unknown): { code?: number; message: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const status = record.status;
  if (status && typeof status === "object") {
    const nested = status as Record<string, unknown>;
    if (typeof nested.error_message === "string") {
      return {
        code: typeof nested.error_code === "number" ? nested.error_code : undefined,
        message: nested.error_message,
      };
    }
  }
  if (typeof record.error === "string") return { message: record.error };
  return null;
}

function isPlanLocked(status: number, message: string): boolean {
  if (status === 404) return true;
  return /paid|exclusive|subscribers|not available for your plan|upgrade/i.test(message);
}

function readNewsArticles(payload: unknown): RawNewsItem[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : Array.isArray((payload as { news?: unknown }).news)
          ? (payload as { news: unknown[] }).news
          : []
      : [];

  const items: RawNewsItem[] = [];
  for (const article of rows) {
    if (!article || typeof article !== "object") continue;
    const record = article as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title : "";
    const articleUrl =
      typeof record.url === "string"
        ? record.url
        : typeof record.news_url === "string"
          ? record.news_url
          : "";
    if (!title || !articleUrl) continue;
    items.push({
      providerId: "coingecko",
      providerItemId: articleUrl,
      title,
      summary: typeof record.description === "string" ? record.description : "",
      sourceName:
        typeof record.source_name === "string"
          ? record.source_name
          : typeof record.news_site === "string"
            ? record.news_site
            : typeof record.author === "string"
              ? record.author
              : "CoinGecko",
      url: articleUrl,
      publishedAt: parseIsoDate(
        record.posted_at ?? record.updated_at ?? record.created_at ?? record.date,
      ),
      raw: null,
    });
  }
  return items;
}

function readTrending(payload: unknown): RawNewsItem[] {
  if (!payload || typeof payload !== "object") return [];
  const coins = (payload as { coins?: unknown }).coins;
  if (!Array.isArray(coins)) return [];

  const items: RawNewsItem[] = [];
  for (const row of coins) {
    if (!row || typeof row !== "object") continue;
    const item = (row as { item?: unknown }).item;
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name : "";
    if (!id || !name) continue;
    const symbol = typeof record.symbol === "string" ? record.symbol.toUpperCase() : "";
    const rank = typeof record.market_cap_rank === "number" ? `Market-cap rank ${record.market_cap_rank}` : "";
    items.push({
      providerId: "coingecko",
      providerItemId: id,
      title: name,
      summary: [symbol, rank].filter(Boolean).join(" · "),
      sourceName: "CoinGecko",
      url: `https://www.coingecko.com/en/coins/${id}`,
      publishedAt: null,
      raw: null,
    });
  }
  return items;
}

export function createCoinGeckoProvider(env: CoinGeckoEnv = {}): NewsProvider {
  const fetchImpl = env.fetchImpl ?? fetch;
  return {
    id: "coingecko",
    label: "CoinGecko",
    ttlMs: COINGECKO_TTL_MS,
    staleMs: COINGECKO_STALE_MS,
    async fetchItems(): Promise<NewsProviderResult> {
      const apiKey = env.apiKey?.trim() ?? "";
      if (!apiKey) {
        return { ok: false, kind: "missing_key", message: "COINGECKO_API_KEY is not set" };
      }

      const attempts: Array<{
        url: string;
        header: "x-cg-demo-api-key" | "x-cg-pro-api-key";
        reader: (payload: unknown) => RawNewsItem[];
      }> = [
        { url: `${DEMO_BASE}/news`, header: "x-cg-demo-api-key", reader: readNewsArticles },
        { url: `${PRO_BASE}/news`, header: "x-cg-pro-api-key", reader: readNewsArticles },
        { url: `${DEMO_BASE}/search/trending`, header: "x-cg-demo-api-key", reader: readTrending },
      ];

      try {
        let lastKind: NewsProviderFailureKind = "provider_error";
        let lastMessage = "CoinGecko news unavailable";

        for (const attempt of attempts) {
          const { status, payload } = await fetchJson(
            new URL(attempt.url),
            {
              headers: {
                Accept: "application/json",
                "User-Agent": USER_AGENT,
                [attempt.header]: apiKey,
              },
            },
            fetchImpl,
          );

          const bodyError = coinGeckoError(payload);
          const message = bodyError?.message ?? "";

          if (status === 429 || bodyError?.code === 429) {
            return { ok: false, kind: "rate_limit", message: "CoinGecko rate limited" };
          }
          if (status === 401 || status === 403) {
            lastKind = "invalid_key";
            lastMessage = "CoinGecko rejected the API key";
            continue;
          }
          if (status >= 400 || bodyError) {
            lastKind = isPlanLocked(status, message) ? "provider_error" : classifyHttp(status);
            lastMessage = message ? `CoinGecko HTTP ${status}` : `CoinGecko HTTP ${status}`;
            continue;
          }
          if (payload == null) {
            lastKind = "malformed";
            lastMessage = "CoinGecko returned a non-JSON body";
            continue;
          }

          return { ok: true, items: attempt.reader(payload) };
        }

        return { ok: false, kind: lastKind, message: lastMessage };
      } catch {
        return { ok: false, kind: "network", message: "Network failure talking to CoinGecko" };
      }
    },
  };
}
