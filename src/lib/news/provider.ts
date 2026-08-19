export type NewsProviderFailureKind =
  | "missing_key"
  | "invalid_key"
  | "rate_limit"
  | "provider_error"
  | "network"
  | "malformed"
  | "empty";

export type RawNewsItem = {
  providerId: string;
  providerItemId: string;
  title: string;
  summary: string;
  sourceName: string;
  url: string;
  publishedAt: string | null;
  raw: unknown;
};

export type NewsProviderSuccess = {
  ok: true;
  items: RawNewsItem[];
};

export type NewsProviderFailure = {
  ok: false;
  kind: NewsProviderFailureKind;
  message: string;
};

export type NewsProviderResult = NewsProviderSuccess | NewsProviderFailure;

export type NewsProvider = {
  id: string;
  label: string;
  ttlMs: number;
  staleMs: number;
  fetchItems(): Promise<NewsProviderResult>;
};
