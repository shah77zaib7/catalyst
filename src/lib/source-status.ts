import type { SourceStatus } from "@/types/catalyst";

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  live: "LIVE",
  cached: "CACHED",
  mock: "MOCK",
  unavailable: "UNAVAILABLE",
};

export const SOURCE_STATUS_DESCRIPTIONS: Record<SourceStatus, string> = {
  live: "Fresh data from a connected provider.",
  cached: "Last known good data. Timestamp is required.",
  mock: "Synthetic data for development only. Never treat as market truth.",
  unavailable: "No connected source. No values are shown.",
};

/** Statuses that may surface a numeric value in the UI. */
export function canDisplayNumericValue(status: SourceStatus): boolean {
  return status === "live" || status === "cached";
}

/** Statuses that must never be visually confused with live market data. */
export function isUnreliableStatus(status: SourceStatus): boolean {
  return status === "mock" || status === "unavailable";
}

export function isMockStatus(status: SourceStatus): boolean {
  return status === "mock";
}
