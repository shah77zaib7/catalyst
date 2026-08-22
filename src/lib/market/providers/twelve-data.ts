import type { MarketDataProvider, ProviderFailureKind, ProviderResult, TimeSeriesQuery } from "../provider";
import { isProviderErrorPayload } from "../normalize";

export const TWELVE_DATA_PROVIDER_ID = "twelve-data";
const QUOTE_URL = "https://api.twelvedata.com/quote";
const TIME_SERIES_URL = "https://api.twelvedata.com/time_series";
const REQUEST_TIMEOUT_MS = 8_000;

export type TwelveDataEnv = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

function classifyHttp(status: number, message: string): ProviderFailureKind {
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 429) return "rate_limit";
  if (status === 404) return "unavailable_symbol";
  if (/invalid or incorrect api key/i.test(message)) return "invalid_key";
  if (/rate|limit/i.test(message)) return "rate_limit";
  if (/symbol/i.test(message)) return "unavailable_symbol";
  return "provider_error";
}

function classifyPayload(payload: unknown): ProviderFailureKind | null {
  if (!isProviderErrorPayload(payload)) return null;
  const code = typeof payload.code === "number" ? payload.code : Number(payload.code);
  const message = typeof payload.message === "string" ? payload.message : "";
  if (code === 401 || code === 403) return "invalid_key";
  if (code === 429) return "rate_limit";
  if (code === 404) return "unavailable_symbol";
  return classifyHttp(Number.isFinite(code) ? code : 400, message);
}

export function createTwelveDataProvider(env: TwelveDataEnv = {}): MarketDataProvider {
  const fetchImpl = env.fetchImpl ?? fetch;

  return {
    id: TWELVE_DATA_PROVIDER_ID,
    async getQuote(symbol): Promise<ProviderResult> {
      const apiKey = env.apiKey?.trim() ?? "";
      if (!apiKey) {
        return {
          ok: false,
          symbol,
          kind: "missing_key",
          message: "TWELVE_DATA_API_KEY is not set",
        };
      }

      const url = new URL(QUOTE_URL);
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("dp", "5");

      try {
        const response = await fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `apikey ${apiKey}`,
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          return {
            ok: false,
            symbol,
            kind: response.ok ? "malformed" : classifyHttp(response.status, ""),
            message: response.ok ? "Provider returned a non-JSON body" : `HTTP ${response.status}`,
          };
        }

        const payloadKind = classifyPayload(payload);
        if (payloadKind) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String((payload as { message?: unknown }).message ?? payloadKind)
              : payloadKind;
          return { ok: false, symbol, kind: payloadKind, message };
        }

        if (!response.ok) {
          return {
            ok: false,
            symbol,
            kind: classifyHttp(response.status, ""),
            message: `HTTP ${response.status}`,
          };
        }

        return { ok: true, symbol, payload };
      } catch {
        return {
          ok: false,
          symbol,
          kind: "network",
          message: "Network failure talking to Twelve Data",
        };
      }
    },
    async getTimeSeries(query: TimeSeriesQuery): Promise<ProviderResult> {
      const apiKey = env.apiKey?.trim() ?? "";
      if (!apiKey) {
        return {
          ok: false,
          symbol: query.symbol,
          kind: "missing_key",
          message: "TWELVE_DATA_API_KEY is not set",
        };
      }

      const url = new URL(TIME_SERIES_URL);
      url.searchParams.set("symbol", query.symbol);
      url.searchParams.set("interval", query.interval);
      url.searchParams.set("start_date", toTwelveDataUtc(query.startUtc));
      url.searchParams.set("end_date", toTwelveDataUtc(query.endUtc));
      url.searchParams.set("timezone", "UTC");
      url.searchParams.set("dp", "5");
      url.searchParams.set("outputsize", "5000");

      try {
        const response = await fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `apikey ${apiKey}`,
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          return {
            ok: false,
            symbol: query.symbol,
            kind: response.ok ? "malformed" : classifyHttp(response.status, ""),
            message: response.ok ? "Provider returned a non-JSON body" : `HTTP ${response.status}`,
          };
        }

        const payloadKind = classifyPayload(payload);
        if (payloadKind) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String((payload as { message?: unknown }).message ?? payloadKind)
              : payloadKind;
          return { ok: false, symbol: query.symbol, kind: payloadKind, message };
        }

        if (!response.ok) {
          return {
            ok: false,
            symbol: query.symbol,
            kind: classifyHttp(response.status, ""),
            message: `HTTP ${response.status}`,
          };
        }

        return { ok: true, symbol: query.symbol, payload };
      } catch {
        return {
          ok: false,
          symbol: query.symbol,
          kind: "network",
          message: "Network failure talking to Twelve Data",
        };
      }
    },
  };
}

function toTwelveDataUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
