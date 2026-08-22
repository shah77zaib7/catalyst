import type { CatalystEvent } from "../../types/catalyst";
import { NEWS_ASSET_TO_SYMBOL } from "../../types/catalyst";
import { ORACLE_SCHEMA_VERSION } from "./config";
import { sanitizeValue } from "./sanitize";
import type { OracleInput } from "./types";

export function projectOracleInput(event: CatalystEvent): OracleInput {
  const intelligence = event.intelligence ?? null;
  const projected: OracleInput = {
    schemaVersion: ORACLE_SCHEMA_VERSION,
    event: {
      id: event.id,
      title: event.title,
      publishedAt: event.publishedAt,
      classification: intelligence?.classification.types ?? [],
      assets: intelligence
        ? intelligence.assets.map((row) => ({ symbol: row.symbol, relevance: row.relevance }))
        : event.assets.map((asset) => ({ symbol: NEWS_ASSET_TO_SYMBOL[asset], relevance: null })),
      source: event.source,
      sourceUrl: event.sourceUrl,
      importance: intelligence?.importance.tier ?? null,
    },
    intelligence,
    marketReaction: event.marketReaction ?? null,
    context: event.context ?? null,
  };
  return sanitizeValue(projected) as OracleInput;
}
