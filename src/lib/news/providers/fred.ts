import { classifyHttp, fetchJson, redactSecrets } from "../http";
import { parseIsoDate } from "../normalize";
import type { NewsProvider, NewsProviderResult, RawNewsItem } from "../provider";

export const FRED_TTL_MS = 60 * 60 * 1000;
export const FRED_STALE_MS = 6 * 60 * 60 * 1000;

const FRED_URL = "https://api.stlouisfed.org/fred/releases/dates";
const RELEVANT_RELEASE = /\b(cpi|consumer price|ppi|producer price|employment|payroll|gdp|gross domestic|fomc|federal funds|industrial production|retail sales|personal income|treasury|unemployment|housing starts|consumer sentiment|pce)\b/i;

export type FredEnv = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

type FredReleaseDate = {
  release_id?: number;
  release_name?: string;
  date?: string;
};

export function isRelevantFredRelease(name: string): boolean {
  return RELEVANT_RELEASE.test(name);
}

export function createFredProvider(env: FredEnv = {}): NewsProvider {
  const fetchImpl = env.fetchImpl ?? fetch;
  return {
    id: "fred",
    label: "FRED",
    ttlMs: FRED_TTL_MS,
    staleMs: FRED_STALE_MS,
    async fetchItems(): Promise<NewsProviderResult> {
      const apiKey = env.apiKey?.trim() ?? "";
      if (!apiKey) {
        return { ok: false, kind: "missing_key", message: "FRED_API_KEY is not set" };
      }

      const url = new URL(FRED_URL);
      url.searchParams.set("file_type", "json");
      url.searchParams.set("limit", "80");
      url.searchParams.set("sort_order", "desc");
      url.searchParams.set("include_release_dates_with_no_data", "false");
      url.searchParams.set("api_key", apiKey);

      try {
        const { status, payload } = await fetchJson(url, { headers: { Accept: "application/json" } }, fetchImpl);
        if (status === 400 || status === 401 || status === 403) {
          return { ok: false, kind: "invalid_key", message: "FRED rejected the request" };
        }
        if (status === 429) return { ok: false, kind: "rate_limit", message: "FRED rate limited" };
        if (status >= 400) return { ok: false, kind: classifyHttp(status), message: `FRED HTTP ${status}` };
        if (!payload || typeof payload !== "object") {
          return { ok: false, kind: "malformed", message: "FRED returned a malformed body" };
        }

        const rows = (payload as { release_dates?: unknown }).release_dates;
        if (!Array.isArray(rows)) {
          return { ok: false, kind: "malformed", message: "FRED payload missing release_dates" };
        }

        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const items: RawNewsItem[] = [];
        for (const row of rows) {
          if (!row || typeof row !== "object") continue;
          const record = row as FredReleaseDate;
          const name = typeof record.release_name === "string" ? record.release_name : "";
          const date = typeof record.date === "string" ? record.date : "";
          const releaseId = record.release_id;
          if (!name || !date || releaseId == null) continue;
          if (!isRelevantFredRelease(name)) continue;
          const publishedAt = parseIsoDate(date);
          if (publishedAt && new Date(publishedAt).getTime() < cutoff) continue;
          items.push({
            providerId: "fred",
            providerItemId: `${releaseId}:${date}`,
            title: name,
            summary: `FRED economic release dated ${date}.`,
            sourceName: "FRED",
            url: `https://fred.stlouisfed.org/release?rid=${releaseId}`,
            publishedAt,
            raw: null,
          });
        }
        return { ok: true, items };
      } catch (error) {
        const message = redactSecrets(error instanceof Error ? error.message : "Network failure talking to FRED", [
          apiKey,
        ]);
        return { ok: false, kind: "network", message };
      }
    },
  };
}
