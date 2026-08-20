import { classifyHttp, fetchJson, redactSecrets } from "../http";
import { parseIsoDate } from "../normalize";
import type { NewsProvider, NewsProviderFailureKind, NewsProviderResult, RawNewsItem } from "../provider";

export const SOSOVALUE_TTL_MS = 5 * 60 * 1000;
export const SOSOVALUE_STALE_MS = 2 * 60 * 60 * 1000;

const BASE_URL = "https://openapi.sosovalue.com/openapi/v1";
const AUTH_HEADER = "x-soso-api-key";

export type SoSoValueEnv = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

type Envelope = {
  code?: number;
  message?: string;
  data?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function unwrapData(payload: unknown): unknown {
  const record = asRecord(payload);
  if (!record) return payload;
  return "data" in record ? record.data : payload;
}

function readList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const record = asRecord(data);
  if (!record) return [];
  if (Array.isArray(record.list)) return record.list;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function matchedSymbols(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const record = asRecord(entry);
      return typeof record?.symbol === "string" ? record.symbol : "";
    })
    .filter(Boolean)
    .join(" ");
}

export function newsRowsToItems(rows: unknown[]): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  for (const row of rows) {
    const record = asRecord(row);
    if (!record) continue;
    const title = firstString(record.title, record.headline);
    const url = firstString(record.original_link, record.source_link, record.url, record.link);
    if (!title || !url) continue;
    const symbols = matchedSymbols(record.matched_currencies ?? record.currencies);
    const content = firstString(record.content, record.summary, record.description);
    items.push({
      providerId: "sosovalue",
      providerItemId: firstString(record.id, url),
      title,
      summary: [content, symbols].filter(Boolean).join(" "),
      sourceName: firstString(record.author, record.source, "SoSoValue"),
      url,
      publishedAt: parseIsoDate(record.release_time ?? record.create_time ?? record.published_at ?? record.date),
      raw: null,
    });
  }
  return items;
}

export function etfRowsToItems(symbol: string, rows: unknown[]): RawNewsItem[] {
  const latest = [...rows]
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row && row.date && row.total_net_inflow != null))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  if (!latest) return [];
  const date = String(latest.date);
  const coin = symbol.toLowerCase();
  return [
    {
      providerId: "sosovalue",
      providerItemId: `etf:${symbol}:${date}`,
      title: `US ${symbol} ETF ${date}`,
      summary: `total_net_inflow ${latest.total_net_inflow}`,
      sourceName: "SoSoValue",
      url: `https://sosovalue.com/assets/etf/us-${coin}-spot`,
      publishedAt: parseIsoDate(date),
      raw: null,
    },
  ];
}

export function macroRowsToItems(rows: unknown[]): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  for (const day of rows) {
    const record = asRecord(day);
    if (!record) continue;
    const date = firstString(record.date);
    const events = Array.isArray(record.events) ? record.events : [];
    events.forEach((event, index) => {
      const title = typeof event === "string" ? event.trim() : firstString(asRecord(event)?.title);
      if (!title || !date) return;
      items.push({
        providerId: "sosovalue",
        providerItemId: `macro:${date}:${index}:${title}`,
        title,
        summary: "",
        sourceName: "SoSoValue",
        url: "https://sosovalue.com/research",
        publishedAt: parseIsoDate(date),
        raw: null,
      });
    });
  }
  return items;
}

function classifyBodyCode(code: number | undefined): NewsProviderFailureKind | null {
  if (code === undefined || code === 0) return null;
  if (code === 429 || code === 42901) return "rate_limit";
  if (code === 401 || code === 403 || code === 40101 || code === 40301) return "invalid_key";
  return "provider_error";
}

export function createSoSoValueProvider(env: SoSoValueEnv = {}): NewsProvider {
  const fetchImpl = env.fetchImpl ?? fetch;
  return {
    id: "sosovalue",
    label: "SoSoValue",
    ttlMs: SOSOVALUE_TTL_MS,
    staleMs: SOSOVALUE_STALE_MS,
    async fetchItems(): Promise<NewsProviderResult> {
      const apiKey = env.apiKey?.trim() ?? "";
      if (!apiKey) {
        return { ok: false, kind: "missing_key", message: "SOSOVALUE_API_KEY is not set" };
      }

      const today = new Date();
      const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const isoDate = (value: Date) => value.toISOString().slice(0, 10);

      const requests: Array<{ path: string; parse: (data: unknown) => RawNewsItem[] }> = [
        {
          path: "/news?page=1&page_size=20&language=en",
          parse: (data) => newsRowsToItems(readList(data)),
        },
        {
          path: "/news/hot?page=1&page_size=20&language=en",
          parse: (data) => newsRowsToItems(readList(data)),
        },
        {
          path: `/etfs/summary-history?symbol=BTC&country_code=US&start_date=${isoDate(start)}&end_date=${isoDate(today)}&limit=8`,
          parse: (data) => etfRowsToItems("BTC", readList(data)),
        },
        {
          path: `/etfs/summary-history?symbol=ETH&country_code=US&start_date=${isoDate(start)}&end_date=${isoDate(today)}&limit=8`,
          parse: (data) => etfRowsToItems("ETH", readList(data)),
        },
        {
          path: "/macro/events",
          parse: (data) => macroRowsToItems(Array.isArray(data) ? data : readList(data)),
        },
      ];

      try {
        const results = await Promise.all(
          requests.map(async (request) => {
            const url = new URL(`${BASE_URL}${request.path}`);
            const { status, payload } = await fetchJson(
              url,
              {
                headers: {
                  Accept: "application/json",
                  [AUTH_HEADER]: apiKey,
                },
              },
              fetchImpl,
            );
            const envelope = asRecord(payload) as Envelope | null;
            const bodyKind = classifyBodyCode(envelope?.code);
            if (status === 429 || bodyKind === "rate_limit") {
              return { ok: false as const, kind: "rate_limit" as const, message: "SoSoValue rate limited" };
            }
            if (status === 401 || status === 403 || bodyKind === "invalid_key") {
              return { ok: false as const, kind: "invalid_key" as const, message: "SoSoValue rejected the API key" };
            }
            if (status >= 400 || bodyKind) {
              return {
                ok: false as const,
                kind: classifyHttp(status),
                message: `SoSoValue HTTP ${status}`,
              };
            }
            if (payload == null) {
              return { ok: false as const, kind: "malformed" as const, message: "SoSoValue returned a non-JSON body" };
            }
            return { ok: true as const, items: request.parse(unwrapData(payload)) };
          }),
        );

        const items: RawNewsItem[] = [];
        let lastFailure: { kind: NewsProviderFailureKind; message: string } | null = null;
        let anyOk = false;
        for (const result of results) {
          if (result.ok) {
            anyOk = true;
            items.push(...result.items);
          } else {
            lastFailure = result;
          }
        }

        if (anyOk) return { ok: true, items };

        return {
          ok: false,
          kind: lastFailure?.kind ?? "provider_error",
          message: redactSecrets(lastFailure?.message ?? "SoSoValue unavailable", [apiKey]),
        };
      } catch (error) {
        return {
          ok: false,
          kind: "network",
          message: redactSecrets(error instanceof Error ? error.message : "Network failure talking to SoSoValue", [
            apiKey,
          ]),
        };
      }
    },
  };
}
