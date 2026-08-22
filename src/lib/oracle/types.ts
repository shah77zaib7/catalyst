import type {
  EventContext,
  EventIntelligence,
  ImportanceTier,
  IntelligenceAssetRelevance,
  IntelligenceType,
  MarketReaction,
} from "../../types/catalyst";

export const ORACLE_SCHEMA_VERSION = "1.0" as const;
export type OracleSchemaVersion = typeof ORACLE_SCHEMA_VERSION;

export const ORACLE_STATUSES = [
  "READY",
  "PROCESSING",
  "SUCCESS",
  "PARTIAL",
  "UNAVAILABLE",
  "ERROR",
] as const;
export type OracleStatus = (typeof ORACLE_STATUSES)[number];

export type OracleEventProjection = {
  id: string;
  title: string;
  publishedAt: string | null;
  classification: IntelligenceType[];
  assets: Array<{ symbol: IntelligenceAssetRelevance["symbol"]; relevance: number | null }>;
  source: string;
  sourceUrl: string;
  importance: ImportanceTier | null;
};

/**
 * Validated projection of CatalystEvent.
 * Source of truth remains CatalystEvent — this is not a second event model.
 */
export type OracleInput = {
  schemaVersion: OracleSchemaVersion;
  event: OracleEventProjection;
  intelligence: EventIntelligence | null;
  marketReaction: MarketReaction | null;
  context: EventContext | null;
};

export type OracleResponse = {
  schemaVersion: OracleSchemaVersion;
  status: OracleStatus;
  summary: string | null;
  facts: string[];
  marketObservation: string | null;
  context: string[];
  interpretation: string[];
  uncertainties: string[];
  limitations: string[];
  fingerprint: string;
  provider: string | null;
  model: string | null;
  errorCategory: string | null;
};

export type OracleValidationIssue = {
  path: string;
  message: string;
};

export type OracleValidationResult =
  | { ok: true; input: OracleInput }
  | { ok: false; issues: OracleValidationIssue[] };
