import type {
  CatalystCategory,
  ConfidenceTier,
  ImportanceTier,
  IntelligenceSymbol,
  IntelligenceType,
  RecencyTier,
} from "../../types/catalyst";

/**
 * Central Event Intelligence configuration.
 * Every numeric rule for Phase 3.1 lives here. Do not scatter copies.
 *
 * CATALYST SCORE (0–100) =
 *   round(
 *     weights.importance        * importance.score        * 100 +
 *     weights.assetRelevance    * max(asset.relevance)    * 100 +
 *     weights.sourceConfidence  * confidence.score        * 100 +
 *     weights.recency           * recency.score           * 100 +
 *     weights.marketSensitivity * max(sensitivity)        * 100
 *   )
 *
 * Missing max(relevance) or max(sensitivity) contributes 0. Never invent.
 */

export const SCORE_WEIGHTS = {
  importance: 0.3,
  assetRelevance: 0.2,
  sourceConfidence: 0.2,
  recency: 0.15,
  marketSensitivity: 0.15,
} as const;

export const PROVIDER_RELIABILITY: Record<string, number> = {
  fred: 0.95,
  sosovalue: 0.82,
  "alpha-vantage": 0.78,
  gdelt: 0.7,
  coingecko: 0.68,
};

export const UNKNOWN_PROVIDER_RELIABILITY = 0.5;
export const CONFIRMATION_BOOST = 0.08;
export const MENTIONED_ASSET_FLOOR = 0.7;

export const CONFIDENCE_TIER_THRESHOLDS: Array<{ min: number; tier: ConfidenceTier }> = [
  { min: 0.9, tier: "VERY_HIGH" },
  { min: 0.75, tier: "HIGH" },
  { min: 0.55, tier: "MEDIUM" },
  { min: 0, tier: "LOW" },
];

export const IMPORTANCE_TIER_SCORES: Record<ImportanceTier, number> = {
  CRITICAL: 0.95,
  HIGH: 0.8,
  MEDIUM: 0.55,
  LOW: 0.28,
};

export const MULTI_ASSET_IMPORTANCE_BUMP = 0.04;

/** Type priority used to pick identity.eventType. */
export const TYPE_PRIORITY: IntelligenceType[] = [
  "CENTRAL_BANK",
  "INTEREST_RATE",
  "INFLATION",
  "EMPLOYMENT",
  "GDP",
  "GEOPOLITICAL",
  "ETF",
  "REGULATION",
  "COMMODITY",
  "CRYPTO",
  "MARKET",
  "CORPORATE",
  "MACRO",
  "OTHER",
];

export const CATEGORY_TYPE_HINTS: Record<CatalystCategory, IntelligenceType[]> = {
  macro: ["MACRO"],
  gold: ["COMMODITY"],
  crypto: ["CRYPTO"],
  geopolitical: ["GEOPOLITICAL"],
  "central-banks": ["CENTRAL_BANK"],
};

export type ClassificationRule = {
  id: string;
  pattern: RegExp;
  types: IntelligenceType[];
};

export const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    id: "fomc",
    pattern:
      /\b(fomc|federal reserve|fed chair|jerome powell|fomc minutes|fed funds|policy rate)\b/i,
    types: ["CENTRAL_BANK", "INTEREST_RATE"],
  },
  {
    id: "rates",
    pattern: /\b(rate hike|rate cut|interest rates?|hikes rates|cuts rates)\b/i,
    types: ["INTEREST_RATE", "CENTRAL_BANK"],
  },
  {
    id: "inflation",
    pattern: /\b(cpi|pce|ppi|inflation|consumer price|producer price|deflation)\b/i,
    types: ["INFLATION", "MACRO"],
  },
  {
    id: "employment",
    pattern: /\b(nfp|nonfarm|non-farm|payrolls|unemployment|jobs report|labor market)\b/i,
    types: ["EMPLOYMENT", "MACRO"],
  },
  {
    id: "gdp",
    pattern: /\b(gdp|gross domestic)\b/i,
    types: ["GDP", "MACRO"],
  },
  {
    id: "etf",
    pattern: /\b(etf|spot btc etf|spot eth etf|net inflow|net outflow|total_net_inflow)\b/i,
    types: ["ETF"],
  },
  {
    id: "regulation",
    pattern: /\b(sec\b|cftc|regulation|regulatory|crypto ban|lawsuit against)\b/i,
    types: ["REGULATION"],
  },
  {
    id: "geopolitical",
    pattern:
      /\b(sanction|sanctions|geopolitics|geopolitical|armed conflict|military strike|missile|invasion|ceasefire|war zone|middle east conflict)\b/i,
    types: ["GEOPOLITICAL"],
  },
  {
    id: "crypto",
    pattern:
      /\b(bitcoin|btc|ethereum|ether\b|solana|\bsol\b|cryptocurrenc(?:y|ies)|digital assets?|crypto market|crypto markets)\b/i,
    types: ["CRYPTO"],
  },
  {
    id: "commodity",
    pattern: /\b(xau|gold price|gold prices|bullion|precious metals?|crude oil|opec|brent|commodity)\b/i,
    types: ["COMMODITY"],
  },
  {
    id: "corporate",
    pattern: /\b(earnings|ipo|acquisition|merger|\bceo\b)\b/i,
    types: ["CORPORATE"],
  },
  {
    id: "market",
    pattern: /\b(stock market|s&p|nasdaq|equity market|risk-off|risk-on)\b/i,
    types: ["MARKET"],
  },
];

export type ImportanceRule = {
  id: string;
  pattern: RegExp;
  types?: IntelligenceType[];
  tier: ImportanceTier;
  reason: string;
};

export const IMPORTANCE_RULES: ImportanceRule[] = [
  {
    id: "fomc-decision",
    pattern: /\b(fomc|federal reserve|fed chair|jerome powell)\b/i,
    types: ["CENTRAL_BANK", "INTEREST_RATE"],
    tier: "CRITICAL",
    reason: "Scheduled or live US central-bank policy event",
  },
  {
    id: "major-conflict",
    pattern: /\b(invasion|military strike|armed conflict|war zone|missile)\b/i,
    types: ["GEOPOLITICAL"],
    tier: "CRITICAL",
    reason: "Major unexpected geopolitical development",
  },
  {
    id: "cpi-print",
    pattern: /\b(cpi|pce|consumer price)\b/i,
    types: ["INFLATION"],
    tier: "HIGH",
    reason: "US inflation print with historical market significance",
  },
  {
    id: "employment-print",
    pattern: /\b(nfp|nonfarm|payrolls|jobs report)\b/i,
    types: ["EMPLOYMENT"],
    tier: "HIGH",
    reason: "US labor-market print",
  },
  {
    id: "etf-flow",
    pattern: /\b(etf|net inflow|net outflow|total_net_inflow)\b/i,
    types: ["ETF"],
    tier: "HIGH",
    reason: "Spot crypto ETF flow or listing event",
  },
  {
    id: "sanctions",
    pattern: /\b(sanction|sanctions)\b/i,
    types: ["GEOPOLITICAL"],
    tier: "HIGH",
    reason: "Sanctions event with cross-asset relevance",
  },
  {
    id: "gdp-print",
    pattern: /\b(gdp|gross domestic)\b/i,
    types: ["GDP"],
    tier: "MEDIUM",
    reason: "Growth print",
  },
  {
    id: "regulation",
    pattern: /\b(sec\b|cftc|regulation|regulatory)\b/i,
    types: ["REGULATION"],
    tier: "MEDIUM",
    reason: "Regulatory development",
  },
  {
    id: "single-crypto",
    pattern: /\b(bitcoin|btc|ethereum|solana|crypto)\b/i,
    types: ["CRYPTO"],
    tier: "MEDIUM",
    reason: "Single-asset or crypto-market announcement",
  },
  {
    id: "gold-price",
    pattern: /\b(gold|xau|bullion)\b/i,
    types: ["COMMODITY"],
    tier: "MEDIUM",
    reason: "Gold/commodity mention",
  },
];

export type RelevanceRule = {
  id: string;
  pattern: RegExp;
  assets: Partial<Record<IntelligenceSymbol, number>>;
};

export const RELEVANCE_RULES: RelevanceRule[] = [
  {
    id: "fomc",
    pattern: /\b(fomc|federal reserve|fed chair|jerome powell|interest rates?|rate hike|rate cut)\b/i,
    assets: { XAUUSD: 0.9, USD: 0.96, BTC: 0.62 },
  },
  {
    id: "cpi",
    pattern: /\b(cpi|pce|ppi|inflation|consumer price|producer price)\b/i,
    assets: { XAUUSD: 0.88, USD: 0.92, BTC: 0.48 },
  },
  {
    id: "employment",
    pattern: /\b(nfp|nonfarm|payrolls|unemployment|jobs report)\b/i,
    assets: { XAUUSD: 0.82, USD: 0.9, BTC: 0.42 },
  },
  {
    id: "btc-etf",
    pattern: /\b(btc etf|bitcoin etf|spot btc|us btc etf)\b/i,
    assets: { BTC: 0.95, USD: 0.4 },
  },
  {
    id: "eth-etf",
    pattern: /\b(eth etf|ethereum etf|us eth etf)\b/i,
    assets: { ETH: 0.95, USD: 0.4 },
  },
  {
    id: "etf-generic",
    pattern: /\b(etf|net inflow|total_net_inflow)\b/i,
    assets: { BTC: 0.86, USD: 0.35 },
  },
  {
    id: "bitcoin",
    pattern: /\b(bitcoin|\bbtc\b)\b/i,
    assets: { BTC: 0.9 },
  },
  {
    id: "ethereum",
    pattern: /\b(ethereum|\beth\b|ether\b)\b/i,
    assets: { ETH: 0.9 },
  },
  {
    id: "solana",
    pattern: /\b(solana|\bsol\b)\b/i,
    assets: { SOL: 0.88 },
  },
  {
    id: "gold",
    pattern: /\b(xau|gold|bullion|precious metals?)\b/i,
    assets: { XAUUSD: 0.92 },
  },
  {
    id: "usd",
    pattern: /\b(us dollar|dxy|greenback|\busd\b)\b/i,
    assets: { USD: 0.9, XAUUSD: 0.7 },
  },
  {
    id: "geopolitical",
    pattern:
      /\b(sanction|sanctions|geopolitics|geopolitical|armed conflict|military strike|missile|invasion|ceasefire|war zone)\b/i,
    assets: { XAUUSD: 0.85, USD: 0.45, BTC: 0.38 },
  },
];

export type SensitivityRule = {
  id: string;
  types?: IntelligenceType[];
  pattern?: RegExp;
  sensitivity: Partial<Record<IntelligenceSymbol, number>>;
};

export const SENSITIVITY_RULES: SensitivityRule[] = [
  {
    id: "fomc",
    types: ["CENTRAL_BANK", "INTEREST_RATE"],
    sensitivity: { USD: 0.95, XAUUSD: 0.9, BTC: 0.6 },
  },
  {
    id: "cpi",
    types: ["INFLATION"],
    sensitivity: { USD: 0.88, XAUUSD: 0.86, BTC: 0.5 },
  },
  {
    id: "etf",
    types: ["ETF"],
    sensitivity: { BTC: 0.92, ETH: 0.7, USD: 0.35 },
  },
  {
    id: "geopolitical",
    types: ["GEOPOLITICAL"],
    sensitivity: { XAUUSD: 0.85, USD: 0.45, BTC: 0.4 },
  },
  {
    id: "crypto",
    types: ["CRYPTO"],
    sensitivity: { BTC: 0.7, ETH: 0.62, SOL: 0.58 },
  },
  {
    id: "employment",
    types: ["EMPLOYMENT"],
    sensitivity: { USD: 0.84, XAUUSD: 0.78, BTC: 0.4 },
  },
];

export const RECENCY_WINDOWS: Array<{ maxMs: number; tier: RecencyTier; score: number }> = [
  { maxMs: 5 * 60 * 1000, tier: "VERY_FRESH", score: 1 },
  { maxMs: 30 * 60 * 1000, tier: "FRESH", score: 0.94 },
  { maxMs: 120 * 60 * 1000, tier: "RECENT", score: 0.8 },
  { maxMs: 6 * 60 * 60 * 1000, tier: "AGING", score: 0.58 },
  { maxMs: 24 * 60 * 60 * 1000, tier: "OLD", score: 0.32 },
  { maxMs: Number.POSITIVE_INFINITY, tier: "ARCHIVE", score: 0.12 },
];

/** Geopolitical events age slower (effective age = age * factor). */
export const GEOPOLITICAL_RECENCY_AGE_FACTOR = 0.55;
export const MISSING_TIMESTAMP_RECENCY_SCORE = 0.12;
