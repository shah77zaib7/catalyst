import { classifyHttp, fetchJson } from "../http";
import { parseIsoDate } from "../normalize";
import type { NewsProvider, NewsProviderResult, RawNewsItem } from "../provider";

export const COINGECKO_TTL_MS = 10 * 60 * 1000;
export const COINGECKO_STALE_MS = 60 * 60 * 1000;

export type CoinGeckoEnv = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

function readArticles(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.news)) return record.news;
  return [];
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

      const attempts = [
        {
          base: "https://api.coingecko.com/api/v3/news",
          header: "x-cg-demo-api-key" as const,
        },
        {
          base: "https://pro-api.coingecko.com/api/v3/news",
          header: "x-cg-pro-api-key" as const,
        },
      ];

      try {
        let lastKind: NewsProviderResult = {
          ok: false,
          kind: "provider_error",
          message: "CoinGecko news unavailable",
        };

        for (const attempt of attempts) {
          const url = new URL(attempt.base);
          const { status, payload } = await fetchJson(
            url,
            {
              headers: {
                Accept: "application/json",
                [attempt.header]: apiKey,
              },
            },
            fetchImpl,
          );

          if (status === 401 || status === 403) {
            lastKind = { ok: false, kind: "invalid_key", message: "CoinGecko rejected the API key" };
            continue;
          }
          if (status === 429) {
            return { ok: false, kind: "rate_limit", message: "CoinGecko rate limited" };
          }
          if (status === 404) {
            lastKind = { ok: false, kind: "provider_error", message: "CoinGecko news endpoint not available" };
            continue;
          }
          if (status >= 400) {
            lastKind = { ok: false, kind: classifyHttp(status), message: `CoinGecko HTTP ${status}` };
            continue;
          }
          if (payload == null || (typeof payload !== "object" && !Array.isArray(payload))) {
            return { ok: false, kind: "malformed", message: "CoinGecko returned a malformed body" };
          }

          const items: RawNewsItem[] = [];
          for (const article of readArticles(payload)) {
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
                typeof record.news_site === "string"
                  ? record.news_site
                  : typeof record.author === "string"
                    ? record.author
                    : "CoinGecko",
              url: articleUrl,
              publishedAt: parseIsoDate(record.updated_at ?? record.created_at ?? record.date),
              raw: null,
            });
          }
          return { ok: true, items };
        }

        return lastKind;
      } catch {
        return { ok: false, kind: "network", message: "Network failure talking to CoinGecko" };
      }
    },
  };
}
