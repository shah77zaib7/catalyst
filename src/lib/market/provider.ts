export type ProviderFailureKind =
  | "missing_key"
  | "invalid_key"
  | "rate_limit"
  | "provider_error"
  | "network"
  | "malformed"
  | "unavailable_symbol";

export type ProviderSuccess = {
  ok: true;
  symbol: string;
  payload: unknown;
};

export type ProviderFailure = {
  ok: false;
  symbol: string;
  kind: ProviderFailureKind;
  message: string;
};

export type ProviderResult = ProviderSuccess | ProviderFailure;

export type TimeSeriesQuery = {
  symbol: string;
  startUtc: string;
  endUtc: string;
  interval: "1min";
};

export type MarketDataProvider = {
  id: string;
  getQuote(symbol: string): Promise<ProviderResult>;
  getTimeSeries?(query: TimeSeriesQuery): Promise<ProviderResult>;
};

export const PROVIDER_FAILURE_SOURCES: Record<ProviderFailureKind, string> = {
  missing_key: "API key not configured",
  invalid_key: "API key rejected",
  rate_limit: "rate limited",
  provider_error: "provider error",
  network: "network failure",
  malformed: "malformed response",
  unavailable_symbol: "symbol unavailable",
};
