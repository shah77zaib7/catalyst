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

export const REACTION_DIRECTIONS = ["UP", "DOWN", "FLAT", "UNKNOWN"] as const;
export type ReactionDirection = (typeof REACTION_DIRECTIONS)[number];

export const REACTION_STRENGTHS = ["VERY_LOW", "LOW", "MODERATE", "HIGH", "EXTREME"] as const;
export type ReactionStrength = (typeof REACTION_STRENGTHS)[number];

export const REACTION_QUALITY_STATUSES = ["GOOD", "PARTIAL", "INSUFFICIENT", "UNAVAILABLE"] as const;
export type ReactionQualityStatus = (typeof REACTION_QUALITY_STATUSES)[number];

export const MARKET_REACTION_STATUSES = ["OBSERVED", "PARTIAL", "INSUFFICIENT", "UNAVAILABLE"] as const;
export type MarketReactionStatus = (typeof MARKET_REACTION_STATUSES)[number];

export const POST_WINDOW_KEYS = ["1m", "5m", "15m", "30m", "1h", "4h"] as const;
export type PostWindowKey = (typeof POST_WINDOW_KEYS)[number];

export type PriceObservation = {
  requestedAt: string;
  observedAt: string;
  price: number;
  deltaSeconds: number;
};

export type ReactionWindow = {
  requestedAt: string;
  observedAt: string | null;
  price: number | null;
  deltaSeconds: number | null;
  change: number | null;
  changePercent: number | null;
  direction: ReactionDirection;
  reason: "not_elapsed" | "no_observation" | null;
};

export type AssetMarketReaction = {
  symbol: IntelligenceSymbol;
  baseline: PriceObservation | null;
  eventPrice: PriceObservation | null;
  preEvent: {
    "15mReturnPercent": number | null;
    "5mReturnPercent": number | null;
    direction: ReactionDirection;
  } | null;
  windows: Record<PostWindowKey, ReactionWindow>;
  maximumMove: {
    upPercent: number;
    downPercent: number;
    absolutePercent: number;
  } | null;
  observedRange: {
    high: number;
    low: number;
    range: number;
    rangePercent: number;
    source: "provider_ohlc" | "observed_closes";
  } | null;
  primaryReaction: {
    window: PostWindowKey;
    direction: ReactionDirection;
    changePercent: number | null;
    strength: ReactionStrength | null;
  };
  reversal: {
    detected: boolean;
    initialDirection?: ReactionDirection;
    laterDirection?: ReactionDirection;
  };
  dataQuality: {
    status: ReactionQualityStatus;
    missingWindows: string[];
    maxObservationLatencySeconds: number | null;
    reason: string | null;
  };
};

/** Observed temporal reaction. Not causality, not a forecast, not a signal. */
export type MarketReaction = {
  status: MarketReactionStatus;
  eventAt: string | null;
  source: string;
  sourceStatus: SourceStatus;
  assets: Partial<Record<IntelligenceSymbol, AssetMarketReaction>>;
  reason: string | null;
};

/**
 * A market-moving item from a connected news or event source.
 * Impact is null unless a provider supplies it — never estimated.
 * Intelligence is attached after clustering; it is never a forecast.
 * marketReaction is observed price behavior around the event, not causality.
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
  marketReaction?: MarketReaction | null;
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
