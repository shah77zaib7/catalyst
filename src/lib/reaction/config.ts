import type {
  ImportanceTier,
  IntelligenceSymbol,
  PostWindowKey,
  ReactionStrength,
} from "../../types/catalyst";

/**
 * Central Phase 3.2 Observed Market Reaction configuration.
 * Temporal reaction ≠ causality. These numbers are defaults, not market standards.
 */

export const REACTION_INTERVAL = "1min" as const;

export const PRE_WINDOWS = [
  { key: "t-15m", offsetMs: -15 * 60 * 1000 },
  { key: "t-5m", offsetMs: -5 * 60 * 1000 },
  { key: "t-1m", offsetMs: -1 * 60 * 1000 },
] as const;

export const POST_WINDOWS: Array<{ key: PostWindowKey; offsetMs: number }> = [
  { key: "1m", offsetMs: 1 * 60 * 1000 },
  { key: "5m", offsetMs: 5 * 60 * 1000 },
  { key: "15m", offsetMs: 15 * 60 * 1000 },
  { key: "30m", offsetMs: 30 * 60 * 1000 },
  { key: "1h", offsetMs: 60 * 60 * 1000 },
  { key: "4h", offsetMs: 4 * 60 * 60 * 1000 },
];

export const BASELINE_OFFSET_MS = -5 * 60 * 1000;
export const PRIMARY_WINDOW: PostWindowKey = "15m";
export const LATER_WINDOW: PostWindowKey = "1h";
export const FALLBACK_LATER_WINDOW: PostWindowKey = "4h";

/** Closest candle may be used if |Δt| ≤ this tolerance. Never interpolate. */
export const OBSERVATION_TOLERANCE_MS = 90 * 1000;

/** |returnPercent| below this is FLAT (noise), not UP/DOWN. */
export const FLAT_THRESHOLD_PERCENT = 0.02;

/**
 * Strength from abs(primary changePercent).
 * First matching minInclusive wins. 0.10 is LOW, not VERY_LOW.
 */
export const STRENGTH_THRESHOLDS: Array<{ minInclusive: number; strength: ReactionStrength }> = [
  { minInclusive: 1.5, strength: "EXTREME" },
  { minInclusive: 0.75, strength: "HIGH" },
  { minInclusive: 0.3, strength: "MODERATE" },
  { minInclusive: 0.1, strength: "LOW" },
  { minInclusive: 0, strength: "VERY_LOW" },
];

export const MIN_RELEVANCE_FOR_REACTION = 0.4;
export const MIN_IMPORTANCE_FOR_REACTION: ImportanceTier = "HIGH";
export const MAX_REACTION_EVENTS_PER_FEED = 5;
export const MAX_ASSETS_PER_EVENT = 4;

export const SERIES_LOOKBACK_MS = 15 * 60 * 1000;
export const SERIES_LOOKAHEAD_MS = 4 * 60 * 60 * 1000;
export const SERIES_PADDING_MS = OBSERVATION_TOLERANCE_MS;

export const COMPLETED_SERIES_TTL_MS = 12 * 60 * 60 * 1000;
export const IN_PROGRESS_SERIES_TTL_MS = 45 * 1000;

export const PROVIDER_SYMBOL: Record<IntelligenceSymbol, string> = {
  XAUUSD: "XAU/USD",
  BTC: "BTC/USD",
  ETH: "ETH/USD",
  SOL: "SOL/USD",
  USD: "DXY",
};

export const REQUIRED_WINDOWS = ["baseline", "event", "15m"] as const;
export const GOOD_MAX_LATENCY_SECONDS = 30;
export const IMPORTANCE_RANK: Record<ImportanceTier, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};
