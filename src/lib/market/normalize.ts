import { ASSET_SYMBOLS } from "../../types/catalyst";
import type { Asset, MarketQuote, SourceStatus } from "../../types/catalyst";

export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function parseTimestamp(payload: Record<string, unknown>): string | null {
  const unix = parseFiniteNumber(payload.timestamp ?? payload.last_quote_at);
  if (unix != null) {
    const millis = unix > 1_000_000_000_000 ? unix : unix * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  if (typeof payload.datetime === "string" && payload.datetime.trim() !== "") {
    const parsed = Date.parse(payload.datetime.replace(" ", "T"));
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  return null;
}

export function isProviderErrorPayload(payload: unknown): payload is {
  status?: string;
  code?: number | string;
  message?: string;
} {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  return record.status === "error" || record.code === 401 || record.code === 429;
}

export function emptyQuote(
  asset: Asset,
  source: string,
  sourceStatus: SourceStatus = "unavailable",
): MarketQuote {
  return {
    asset,
    symbol: ASSET_SYMBOLS[asset],
    price: null,
    currency: "USD",
    change24h: null,
    changePercent24h: null,
    open: null,
    high: null,
    low: null,
    previousClose: null,
    timestamp: null,
    source,
    sourceStatus,
  };
}

export function stripUntrustedNumbers(quote: MarketQuote): MarketQuote {
  return {
    ...quote,
    price: null,
    change24h: null,
    changePercent24h: null,
    open: null,
    high: null,
    low: null,
    previousClose: null,
  };
}

/**
 * Map a raw Twelve Data /quote payload onto MarketQuote.
 * Returns null when the payload cannot yield a real price — never invents one.
 */
export function normalizeTwelveDataQuote(
  asset: Asset,
  payload: unknown,
  sourceStatus: SourceStatus,
  source: string,
): MarketQuote | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (isProviderErrorPayload(payload)) return null;

  const record = payload as Record<string, unknown>;
  const price = parseFiniteNumber(record.close ?? record.price);
  if (price == null) return null;

  const currency = typeof record.currency === "string" && record.currency.trim() !== ""
    ? record.currency
    : "USD";

  return {
    asset,
    symbol: ASSET_SYMBOLS[asset],
    price,
    currency,
    change24h: parseFiniteNumber(record.change ?? record.rolling_1d_change),
    changePercent24h: parseFiniteNumber(record.percent_change),
    open: parseFiniteNumber(record.open),
    high: parseFiniteNumber(record.high),
    low: parseFiniteNumber(record.low),
    previousClose: parseFiniteNumber(record.previous_close),
    timestamp: parseTimestamp(record),
    source,
    sourceStatus,
  };
}

export function asCachedQuote(quote: MarketQuote): MarketQuote {
  return {
    ...quote,
    sourceStatus: "cached",
  };
}

export type MarketCandle = {
  observedAt: string;
  close: number;
  open: number | null;
  high: number | null;
  low: number | null;
};

function candleTimeToIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const raw = value.trim();
  const withT = raw.includes("T") ? raw : raw.replace(" ", "T");
  const utc = /Z$|[+-]\d{2}:?\d{2}$/.test(withT) ? withT : `${withT}Z`;
  const parsed = Date.parse(utc);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/**
 * Map a Twelve Data /time_series payload onto candles.
 * Bars without a real close are skipped. Nothing is interpolated.
 */
export function normalizeTwelveDataTimeSeries(payload: unknown): MarketCandle[] | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (isProviderErrorPayload(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.values)) return null;

  const candles: MarketCandle[] = [];
  for (const row of record.values) {
    if (!row || typeof row !== "object") continue;
    const bar = row as Record<string, unknown>;
    const close = parseFiniteNumber(bar.close);
    const observedAt = candleTimeToIso(bar.datetime ?? bar.timestamp);
    if (close == null || !observedAt) continue;
    candles.push({
      observedAt,
      close,
      open: parseFiniteNumber(bar.open),
      high: parseFiniteNumber(bar.high),
      low: parseFiniteNumber(bar.low),
    });
  }

  candles.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  return candles;
}
