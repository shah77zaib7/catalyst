import { canDisplayNumericValue } from "@/lib/source-status";
import type { Asset, MarketQuote } from "@/types/catalyst";

/**
 * Honest unavailable quote. Price fields are forced to null.
 * Future providers must return a real SourceStatus and never invent prices.
 */
export function unavailableQuote(asset: Asset): MarketQuote {
  return {
    asset,
    price: null,
    currency: "USD",
    changeAbsolute: null,
    changePercent: null,
    asOf: null,
    source: "not connected",
    sourceStatus: "unavailable",
  };
}

/** Strip numbers from quotes that are not live or cached. */
export function sanitizeQuote(quote: MarketQuote): MarketQuote {
  if (canDisplayNumericValue(quote.sourceStatus)) {
    return quote;
  }
  return {
    ...quote,
    price: null,
    changeAbsolute: null,
    changePercent: null,
  };
}

export function getWatchlistQuotes(assets: readonly Asset[]): MarketQuote[] {
  return assets.map((asset) => sanitizeQuote(unavailableQuote(asset)));
}

export const DASHBOARD_WATCHLIST = ["gold", "bitcoin"] as const satisfies readonly Asset[];
