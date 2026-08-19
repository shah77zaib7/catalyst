import { emptyQuote, stripUntrustedNumbers } from "./normalize";
import { canDisplayNumericValue } from "../source-status";
import type { Asset, MarketQuote } from "../../types/catalyst";

export {
  CRYPTO_WATCHLIST,
  DASHBOARD_WATCHLIST,
  GOLD_WATCHLIST,
} from "./instruments";

/**
 * Honest unavailable quote. Price fields are forced to null.
 * Future providers must return a real SourceStatus and never invent prices.
 */
export function unavailableQuote(asset: Asset): MarketQuote {
  return emptyQuote(asset, "twelve-data");
}

/** Strip numbers from quotes that are not live or cached. */
export function sanitizeQuote(quote: MarketQuote): MarketQuote {
  if (canDisplayNumericValue(quote.sourceStatus)) {
    return quote;
  }
  return stripUntrustedNumbers(quote);
}

export function getWatchlistQuotes(assets: readonly Asset[]): MarketQuote[] {
  return assets.map((asset) => sanitizeQuote(unavailableQuote(asset)));
}
