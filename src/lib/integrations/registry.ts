import type { SourceStatus } from "@/types/catalyst";

/**
 * Every external integration must expose a source status.
 * Market data: Twelve Data. News: GDELT / CoinGecko / FRED / Alpha Vantage.
 */
export type IntegrationId =
  | "market-data"
  | "news"
  | "calendar"
  | "alerts"
  | "ai";

export type IntegrationSnapshot = {
  id: IntegrationId;
  label: string;
  sourceStatus: SourceStatus;
  detail: string;
  lastUpdated: string | null;
};

const BASE_INTEGRATIONS: readonly IntegrationSnapshot[] = [
  {
    id: "market-data",
    label: "Market data",
    sourceStatus: "unavailable",
    detail: "No market-data API key is configured. Market data is UNAVAILABLE.",
    lastUpdated: null,
  },
  {
    id: "news",
    label: "News",
    sourceStatus: "unavailable",
    detail: "No news source has returned usable items yet.",
    lastUpdated: null,
  },
  {
    id: "calendar",
    label: "Economic calendar",
    sourceStatus: "unavailable",
    detail: "No calendar source is connected.",
    lastUpdated: null,
  },
  {
    id: "alerts",
    label: "Alerts",
    sourceStatus: "unavailable",
    detail: "Notification delivery is not connected.",
    lastUpdated: null,
  },
  {
    id: "ai",
    label: "AI interpretation",
    sourceStatus: "unavailable",
    detail: "AI analysis is not connected.",
    lastUpdated: null,
  },
] as const;

export const INTEGRATIONS: readonly IntegrationSnapshot[] = BASE_INTEGRATIONS;

export type IntegrationOverrides = {
  market?: Partial<Pick<IntegrationSnapshot, "sourceStatus" | "detail" | "lastUpdated">>;
  news?: Partial<Pick<IntegrationSnapshot, "sourceStatus" | "detail" | "lastUpdated">>;
};

export function getIntegrations(overrides: IntegrationOverrides = {}): IntegrationSnapshot[] {
  return BASE_INTEGRATIONS.map((item) => {
    if (item.id === "market-data" && overrides.market) return { ...item, ...overrides.market };
    if (item.id === "news" && overrides.news) return { ...item, ...overrides.news };
    return item;
  });
}

export function getIntegration(id: IntegrationId): IntegrationSnapshot {
  const found = BASE_INTEGRATIONS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown integration: ${id}`);
  }
  return found;
}
