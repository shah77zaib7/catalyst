import { parseIsoDate } from "../normalize";
import { classifyHttp, fetchJson } from "../http";
import type { NewsProvider, NewsProviderResult, RawNewsItem } from "../provider";

export const GDELT_TTL_MS = 20 * 60 * 1000;
export const GDELT_STALE_MS = 2 * 60 * 60 * 1000;

const GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_QUERY =
  '(gold OR bitcoin OR ethereum OR solana OR "federal reserve" OR inflation OR CPI OR sanctions OR geopolitics)';

export type GdeltEnv = {
  fetchImpl?: typeof fetch;
};

function asArticles(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const articles = (payload as { articles?: unknown }).articles;
  return Array.isArray(articles) ? articles : [];
}

export function createGdeltProvider(env: GdeltEnv = {}): NewsProvider {
  const fetchImpl = env.fetchImpl ?? fetch;
  return {
    id: "gdelt",
    label: "GDELT",
    ttlMs: GDELT_TTL_MS,
    staleMs: GDELT_STALE_MS,
    async fetchItems(): Promise<NewsProviderResult> {
      const url = new URL(GDELT_URL);
      url.searchParams.set("query", GDELT_QUERY);
      url.searchParams.set("mode", "ArtList");
      url.searchParams.set("maxrecords", "40");
      url.searchParams.set("timespan", "15h");
      url.searchParams.set("sort", "DateDesc");
      url.searchParams.set("format", "json");

      try {
        const { status, payload } = await fetchJson(url, { headers: { Accept: "application/json" } }, fetchImpl);
        if (status === 429) return { ok: false, kind: "rate_limit", message: "GDELT rate limited" };
        if (!status || status >= 400) {
          return { ok: false, kind: classifyHttp(status), message: `GDELT HTTP ${status}` };
        }
        if (payload == null || typeof payload !== "object") {
          return { ok: false, kind: "malformed", message: "GDELT returned a non-JSON body" };
        }

        const items: RawNewsItem[] = [];
        for (const article of asArticles(payload)) {
          if (!article || typeof article !== "object") continue;
          const record = article as Record<string, unknown>;
          const title = typeof record.title === "string" ? record.title : "";
          const articleUrl = typeof record.url === "string" ? record.url : "";
          if (!title || !articleUrl) continue;
          items.push({
            providerId: "gdelt",
            providerItemId: articleUrl,
            title,
            summary: "",
            sourceName: typeof record.domain === "string" ? record.domain : "GDELT",
            url: articleUrl,
            publishedAt: parseIsoDate(record.seendate),
            raw: null,
          });
        }

        return { ok: true, items };
      } catch {
        return { ok: false, kind: "network", message: "Network failure talking to GDELT" };
      }
    },
  };
}
