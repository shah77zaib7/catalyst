import type { SourceStatus } from "@/types/catalyst";

/**
 * Every external integration must expose a source status.
 * Market data is wired to Twelve Data (server-side). Other phases remain unavailable.
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
    detail: "No news source is connected.",
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

export function getIntegrations(
  market?: Partial<Pick<IntegrationSnapshot, "sourceStatus" | "detail" | "lastUpdated">>,
): IntegrationSnapshot[] {
  return BASE_INTEGRATIONS.map((item) =>
    item.id === "market-data" && market ? { ...item, ...market } : item,
  );
}

export function getIntegration(id: IntegrationId): IntegrationSnapshot {
  const found = BASE_INTEGRATIONS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown integration: ${id}`);
  }
  return found;
}
