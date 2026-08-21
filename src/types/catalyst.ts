/**
 * Core Catalyst domain types.
 *
 * Pipeline contract (never invert):
 *   RAW DATA → DETERMINISTIC PROCESSING → AI INTERPRETATION → USER
 *
 * Event Intelligence (Phase 3.1) sits after normalization/dedupe and before
 * Oracle. It describes WHAT happened — never what price will do.
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

export const INTELLIGENCE_TYPES = [
  "MACRO",
  "CENTRAL_BANK",
  "INFLATION",
  "EMPLOYMENT",
  "GDP",
  "INTEREST_RATE",
  "ETF",
  "REGULATION",
  "GEOPOLITICAL",
  "CRYPTO",
  "COMMODITY",
  "CORPORATE",
  "MARKET",
  "OTHER",
] as const;
export type IntelligenceType = (typeof INTELLIGENCE_TYPES)[number];

export const INTELLIGENCE_SYMBOLS = ["XAUUSD", "BTC", "ETH", "SOL", "USD"] as const;
export type IntelligenceSymbol = (typeof INTELLIGENCE_SYMBOLS)[number];

export const IMPORTANCE_TIERS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type ImportanceTier = (typeof IMPORTANCE_TIERS)[number];

export const CONFIDENCE_TIERS = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"] as const;
export type ConfidenceTier = (typeof CONFIDENCE_TIERS)[number];

export const RECENCY_TIERS = ["VERY_FRESH", "FRESH", "RECENT", "AGING", "OLD", "ARCHIVE"] as const;
export type RecencyTier = (typeof RECENCY_TIERS)[number];

export const EVENT_LIFECYCLE_STATUSES = ["active", "updated", "expired", "archived"] as const;
export type EventLifecycleStatus = (typeof EVENT_LIFECYCLE_STATUSES)[number];

export type IntelligenceAssetRelevance = {
  symbol: IntelligenceSymbol;
  /** Event-to-asset relevance 0–1. Not a probability of price movement. */
  relevance: number;
};

export type EventIntelligence = {
  identity: {
    eventId: string;
    title: string;
    source: string;
    sourceUrl: string;
    publishedAt: string | null;
    detectedAt: string;
    eventType: IntelligenceType;
    status: EventLifecycleStatus;
  };
  classification: {
    types: IntelligenceType[];
  };
  assets: IntelligenceAssetRelevance[];
  importance: {
    tier: ImportanceTier;
    score: number;
    reasons: string[];
  };
  sourceConfidence: {
    score: number;
    tier: ConfidenceTier;
    confirmationCount: number;
  };
  recency: {
    tier: RecencyTier;
    score: number;
  };
  /** Potential market sensitivity per asset. Not direction. */
  marketSensitivity: Partial<Record<IntelligenceSymbol, number>>;
  score: {
    overall: number;
    components: {
      importance: number;
      assetRelevance: number;
      sourceConfidence: number;
      recency: number;
      marketSensitivity: number;
    };
  };
};

/**
 * A market-moving item from a connected news or event source.
 * Impact is null unless a provider supplies it — never estimated.
 * Intelligence is attached after clustering; it is never a forecast.
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
  intelligence?: EventIntelligence | null;
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

export const INTELLIGENCE_SYMBOL_LABELS: Record<IntelligenceSymbol, string> = {
  XAUUSD: "Gold",
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  USD: "USD",
};

export const NEWS_ASSET_TO_SYMBOL: Record<NewsAsset, IntelligenceSymbol> = {
  gold: "XAUUSD",
  btc: "BTC",
  eth: "ETH",
  sol: "SOL",
  usd: "USD",
};
