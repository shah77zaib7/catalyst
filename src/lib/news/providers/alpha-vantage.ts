import { classifyHttp, fetchJson, redactSecrets } from "../http";
import { parseIsoDate } from "../normalize";
import type { NewsProvider, NewsProviderResult, RawNewsItem } from "../provider";

export const ALPHA_VANTAGE_TTL_MS = 30 * 60 * 1000;
export const ALPHA_VANTAGE_STALE_MS = 2 * 60 * 60 * 1000;

const AV_URL = "https://www.alphavantage.co/query";

export type AlphaVantageEnv = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

export function createAlphaVantageProvider(env: AlphaVantageEnv = {}): NewsProvider {
  const fetchImpl = env.fetchImpl ?? fetch;
  return {
    id: "alpha-vantage",
    label: "Alpha Vantage",
    ttlMs: ALPHA_VANTAGE_TTL_MS,
    staleMs: ALPHA_VANTAGE_STALE_MS,
    async fetchItems(): Promise<NewsProviderResult> {
      const apiKey = env.apiKey?.trim() ?? "";
      if (!apiKey) {
        return { ok: false, kind: "missing_key", message: "ALPHA_VANTAGE_API_KEY is not set" };
      }

      const url = new URL(AV_URL);
      url.searchParams.set("function", "NEWS_SENTIMENT");
      url.searchParams.set("topics", "economy_macro,financial_markets,blockchain");
      url.searchParams.set("limit", "30");
      url.searchParams.set("apikey", apiKey);

      try {
        const { status, payload } = await fetchJson(url, { headers: { Accept: "application/json" } }, fetchImpl);
        if (status === 429) return { ok: false, kind: "rate_limit", message: "Alpha Vantage rate limited" };
        if (status >= 400) return { ok: false, kind: classifyHttp(status), message: `Alpha Vantage HTTP ${status}` };
        if (!payload || typeof payload !== "object") {
          return { ok: false, kind: "malformed", message: "Alpha Vantage returned a malformed body" };
        }

        const record = payload as Record<string, unknown>;
        if (typeof record.Note === "string" || typeof record.Information === "string") {
          return { ok: false, kind: "rate_limit", message: "Alpha Vantage rate limited" };
        }
        if (typeof record["Error Message"] === "string") {
          return { ok: false, kind: "invalid_key", message: "Alpha Vantage rejected the request" };
        }
        if (!Array.isArray(record.feed)) {
          return { ok: false, kind: "malformed", message: "Alpha Vantage payload missing feed" };
        }

        const items: RawNewsItem[] = [];
        for (const article of record.feed) {
          if (!article || typeof article !== "object") continue;
          const row = article as Record<string, unknown>;
          const title = typeof row.title === "string" ? row.title : "";
          const articleUrl = typeof row.url === "string" ? row.url : "";
          if (!title || !articleUrl) continue;
          items.push({
            providerId: "alpha-vantage",
            providerItemId: articleUrl,
            title,
            summary: typeof row.summary === "string" ? row.summary : "",
            sourceName: typeof row.source === "string" ? row.source : "Alpha Vantage",
            url: articleUrl,
            publishedAt: parseIsoDate(row.time_published),
            raw: null,
          });
        }
        return { ok: true, items };
      } catch (error) {
        const message = redactSecrets(
          error instanceof Error ? error.message : "Network failure talking to Alpha Vantage",
          [apiKey],
        );
        return { ok: false, kind: "network", message };
      }
    },
  };
}
