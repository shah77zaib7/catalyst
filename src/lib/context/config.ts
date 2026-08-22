import type { ImportanceTier, IntelligenceType } from "../../types/catalyst";

/**
 * Phase 3.3 Event Context configuration.
 * Nearby ≠ related-by-cause. These windows only describe temporal neighborhood.
 */

export const PRE_CONTEXT_MS = 60 * 60 * 1000;
export const POST_CONTEXT_MS = 60 * 60 * 1000;
export const WIDER_CONTEXT_MS = 4 * 60 * 60 * 1000;
export const SIMULTANEOUS_MS = 5 * 60 * 1000;
export const DENSITY_WINDOW_MS = 60 * 60 * 1000;
export const DENSITY_WINDOW_MINUTES = 60;
export const MAX_RELATED_EVENTS = 10;

export const MACRO_THEME_TYPES: IntelligenceType[] = [
  "MACRO",
  "CENTRAL_BANK",
  "INFLATION",
  "EMPLOYMENT",
  "GDP",
  "INTEREST_RATE",
];

export const CONFIGURED_THEMES = [
  {
    id: "US_MONETARY_POLICY",
    types: ["CENTRAL_BANK", "INTEREST_RATE", "INFLATION", "EMPLOYMENT"] as IntelligenceType[],
  },
] as const;

export const IMPORTANCE_RANK: Record<ImportanceTier, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/** Transparent ranking points. Not a confidence score and not shown as one. */
export const RANK_POINTS = {
  simultaneous: 100,
  nearby: 50,
  wider: 15,
  perSharedAsset: 20,
  sameCategory: 15,
  sameCurrency: 10,
  sameMacroTheme: 10,
  importance: {
    CRITICAL: 40,
    HIGH: 25,
    MEDIUM: 10,
    LOW: 0,
  } satisfies Record<ImportanceTier, number>,
} as const;
