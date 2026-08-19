/**
 * Core Catalyst domain types.
 *
 * Pipeline contract (never invert):
 *   RAW DATA → DETERMINISTIC PROCESSING → AI INTERPRETATION → USER
 *
 * These types are the shared contract for future integrations.
 * Do not populate the UI with invented instances of these objects.
 */

export const ASSETS = ["gold", "bitcoin", "ethereum", "solana"] as const;
export type Asset = (typeof ASSETS)[number];

export const NEWS_ASSETS = ["gold", "btc", "eth", "sol", "usd"] as const;
export type NewsAsset = (typeof NEWS_ASSETS)[number];

export const CATALYST_CATEGORIES = [
  "macro",
  "gold",
  "crypto",
  "geopolitical",
  "central-banks",
] as const;
export type CatalystCategory = (typeof CATALYST_CATEGORIES)[number];

export const IMPACT_LEVELS = ["low", "medium", "high", "critical"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const SOURCE_STATUSES = ["live", "cached", "mock", "unavailable"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

/**
 * A market-moving item from a connected news or event source.
 * Impact is null unless a provider supplies it — never estimated.
 */
export type CatalystEvent = {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  sourceUrls: string[];
  publishedAt: string | null;
  fetchedAt: string;
  assets: NewsAsset[];
  categories: CatalystCategory[];
  impact: ImpactLevel | null;
  sourceStatus: SourceStatus;
  providers: string[];
};

export type MarketQuote = {
  asset: Asset;
  symbol: string;
  /** Null when the source is unavailable or the quote is not trusted. */
  price: number | null;
  currency: string;
  change24h: number | null;
  changePercent24h: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  timestamp: string | null;
  source: string;
  sourceStatus: SourceStatus;
};

export type EconomicEvent = {
  id: string;
  timestamp: string;
  title: string;
  country: string;
  impact: ImpactLevel;
  affectedAssets: Asset[];
  source: string;
  sourceStatus: SourceStatus;
};

export const ASSET_LABELS: Record<Asset, string> = {
  gold: "Gold",
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
};

export const ASSET_TICKERS: Record<Asset, string> = {
  gold: "XAU",
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
};

export const ASSET_SYMBOLS: Record<Asset, string> = {
  gold: "XAU/USD",
  bitcoin: "BTC/USD",
  ethereum: "ETH/USD",
  solana: "SOL/USD",
};

export const NEWS_ASSET_LABELS: Record<NewsAsset, string> = {
  gold: "Gold",
  btc: "BTC",
  eth: "ETH",
  sol: "SOL",
  usd: "USD",
};
