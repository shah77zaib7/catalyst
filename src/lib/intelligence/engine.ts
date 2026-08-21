import type {
  CatalystEvent,
  ConfidenceTier,
  EventIntelligence,
  EventLifecycleStatus,
  ImportanceTier,
  IntelligenceSymbol,
  IntelligenceType,
  RecencyTier,
} from "../../types/catalyst";
import { NEWS_ASSET_TO_SYMBOL } from "../../types/catalyst";
import {
  CATEGORY_TYPE_HINTS,
  CLASSIFICATION_RULES,
  CONFIDENCE_TIER_THRESHOLDS,
  CONFIRMATION_BOOST,
  GEOPOLITICAL_RECENCY_AGE_FACTOR,
  IMPORTANCE_RULES,
  IMPORTANCE_TIER_SCORES,
  MENTIONED_ASSET_FLOOR,
  MISSING_TIMESTAMP_RECENCY_SCORE,
  MULTI_ASSET_IMPORTANCE_BUMP,
  PROVIDER_RELIABILITY,
  RECENCY_WINDOWS,
  RELEVANCE_RULES,
  SCORE_WEIGHTS,
  SENSITIVITY_RULES,
  TYPE_PRIORITY,
  UNKNOWN_PROVIDER_RELIABILITY,
} from "./config";

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function eventHaystack(event: CatalystEvent): string {
  return `${event.title} ${event.summary}`;
}

export function classifyEvent(event: CatalystEvent): IntelligenceType[] {
  const haystack = eventHaystack(event);
  const types: IntelligenceType[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(haystack)) types.push(...rule.types);
  }
  for (const category of event.categories) {
    types.push(...(CATEGORY_TYPE_HINTS[category] ?? []));
  }

  const uniqueTypes = unique(types);
  if (uniqueTypes.length === 0) return ["OTHER"];
  return TYPE_PRIORITY.filter((type) => uniqueTypes.includes(type));
}

export function primaryType(types: IntelligenceType[]): IntelligenceType {
  return TYPE_PRIORITY.find((type) => types.includes(type)) ?? "OTHER";
}

export function assetRelevance(
  event: CatalystEvent,
  types: IntelligenceType[],
): Array<{ symbol: IntelligenceSymbol; relevance: number }> {
  const haystack = eventHaystack(event);
  const scores = new Map<IntelligenceSymbol, number>();

  for (const rule of RELEVANCE_RULES) {
    if (!rule.pattern.test(haystack)) continue;
    for (const [symbol, value] of Object.entries(rule.assets) as Array<[IntelligenceSymbol, number]>) {
      const current = scores.get(symbol) ?? 0;
      scores.set(symbol, Math.max(current, value));
    }
  }

  for (const asset of event.assets) {
    const symbol = NEWS_ASSET_TO_SYMBOL[asset];
    if (!symbol) continue;
    const current = scores.get(symbol) ?? 0;
    scores.set(symbol, Math.max(current, MENTIONED_ASSET_FLOOR));
  }

  if (types.includes("ETF") && !scores.has("BTC") && /\beth\b|ethereum/i.test(haystack)) {
    scores.set("ETH", Math.max(scores.get("ETH") ?? 0, 0.9));
  }

  return [...scores.entries()]
    .map(([symbol, relevance]) => ({ symbol, relevance: round2(clamp01(relevance)) }))
    .filter((row) => row.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || a.symbol.localeCompare(b.symbol));
}

const TIER_RANK: Record<ImportanceTier, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function importanceOf(
  event: CatalystEvent,
  assets: Array<{ symbol: IntelligenceSymbol; relevance: number }>,
): { tier: ImportanceTier; score: number; reasons: string[] } {
  const haystack = eventHaystack(event);
  const reasons: string[] = [];
  let tier: ImportanceTier = "LOW";

  for (const rule of IMPORTANCE_RULES) {
    if (!rule.pattern.test(haystack)) continue;
    reasons.push(rule.reason);
    if (TIER_RANK[rule.tier] > TIER_RANK[tier]) tier = rule.tier;
  }

  if (reasons.length === 0) {
    reasons.push("No high-significance pattern matched");
  }

  let score = IMPORTANCE_TIER_SCORES[tier];
  if (assets.length >= 3) {
    score = clamp01(score + MULTI_ASSET_IMPORTANCE_BUMP);
    reasons.push("Three or more mapped assets");
  }

  return { tier, score: round2(score), reasons: unique(reasons) };
}

export function sourceConfidenceOf(event: CatalystEvent): {
  score: number;
  tier: ConfidenceTier;
  confirmationCount: number;
} {
  const providers = unique(event.providers.filter(Boolean));
  const confirmationCount = Math.max(1, providers.length);
  const reliabilities = providers.map((id) => PROVIDER_RELIABILITY[id] ?? UNKNOWN_PROVIDER_RELIABILITY);
  const base = reliabilities.length > 0 ? Math.max(...reliabilities) : UNKNOWN_PROVIDER_RELIABILITY;
  const score = round2(clamp01(base + CONFIRMATION_BOOST * (confirmationCount - 1)));
  const tier = CONFIDENCE_TIER_THRESHOLDS.find((row) => score >= row.min)?.tier ?? "LOW";
  return { score, tier, confirmationCount };
}

export function recencyOf(
  event: CatalystEvent,
  types: IntelligenceType[],
  nowMs: number,
): { tier: RecencyTier; score: number; ageMs: number | null } {
  const stamp = event.publishedAt ?? event.fetchedAt ?? null;
  if (!stamp) {
    return { tier: "ARCHIVE", score: MISSING_TIMESTAMP_RECENCY_SCORE, ageMs: null };
  }
  const parsed = Date.parse(stamp);
  if (Number.isNaN(parsed)) {
    return { tier: "ARCHIVE", score: MISSING_TIMESTAMP_RECENCY_SCORE, ageMs: null };
  }

  const rawAge = Math.max(0, nowMs - parsed);
  const ageMs = types.includes("GEOPOLITICAL") ? rawAge * GEOPOLITICAL_RECENCY_AGE_FACTOR : rawAge;
  const window = RECENCY_WINDOWS.find((row) => ageMs <= row.maxMs) ?? RECENCY_WINDOWS[RECENCY_WINDOWS.length - 1];
  return { tier: window.tier, score: window.score, ageMs: rawAge };
}

export function marketSensitivityOf(
  event: CatalystEvent,
  types: IntelligenceType[],
  assets: Array<{ symbol: IntelligenceSymbol; relevance: number }>,
): Partial<Record<IntelligenceSymbol, number>> {
  const haystack = eventHaystack(event);
  const scores = new Map<IntelligenceSymbol, number>();

  for (const rule of SENSITIVITY_RULES) {
    const typeHit = rule.types?.some((type) => types.includes(type)) ?? false;
    const textHit = rule.pattern ? rule.pattern.test(haystack) : false;
    if (!typeHit && !textHit) continue;
    for (const [symbol, value] of Object.entries(rule.sensitivity) as Array<[IntelligenceSymbol, number]>) {
      const current = scores.get(symbol) ?? 0;
      scores.set(symbol, Math.max(current, value));
    }
  }

  const relevant = new Set(assets.map((row) => row.symbol));
  const out: Partial<Record<IntelligenceSymbol, number>> = {};
  for (const [symbol, value] of scores) {
    if (relevant.size > 0 && !relevant.has(symbol)) continue;
    out[symbol] = round2(clamp01(value));
  }
  return out;
}

export function catalystScore(input: {
  importance: number;
  assetRelevance: number;
  sourceConfidence: number;
  recency: number;
  marketSensitivity: number;
}): EventIntelligence["score"] {
  const components = {
    importance: Math.round(clamp01(input.importance) * 100),
    assetRelevance: Math.round(clamp01(input.assetRelevance) * 100),
    sourceConfidence: Math.round(clamp01(input.sourceConfidence) * 100),
    recency: Math.round(clamp01(input.recency) * 100),
    marketSensitivity: Math.round(clamp01(input.marketSensitivity) * 100),
  };
  const overall = Math.round(
    SCORE_WEIGHTS.importance * components.importance +
      SCORE_WEIGHTS.assetRelevance * components.assetRelevance +
      SCORE_WEIGHTS.sourceConfidence * components.sourceConfidence +
      SCORE_WEIGHTS.recency * components.recency +
      SCORE_WEIGHTS.marketSensitivity * components.marketSensitivity,
  );
  return {
    overall: Math.min(100, Math.max(0, overall)),
    components,
  };
}

export function lifecycleStatus(
  recency: RecencyTier,
  confirmationCount: number,
  types: IntelligenceType[],
): EventLifecycleStatus {
  if (recency === "ARCHIVE" && !types.includes("GEOPOLITICAL")) return "archived";
  if (recency === "ARCHIVE" && types.includes("GEOPOLITICAL")) return "active";
  if (confirmationCount > 1) return "updated";
  return "active";
}

export function analyzeEvent(event: CatalystEvent, nowMs: number): EventIntelligence {
  const types = classifyEvent(event);
  const assets = assetRelevance(event, types);
  const importance = importanceOf(event, assets);
  const sourceConfidence = sourceConfidenceOf(event);
  const recency = recencyOf(event, types, nowMs);
  const marketSensitivity = marketSensitivityOf(event, types, assets);
  const maxRelevance = assets[0]?.relevance ?? 0;
  const maxSensitivity = Math.max(0, ...Object.values(marketSensitivity));
  const score = catalystScore({
    importance: importance.score,
    assetRelevance: maxRelevance,
    sourceConfidence: sourceConfidence.score,
    recency: recency.score,
    marketSensitivity: maxSensitivity,
  });

  return {
    identity: {
      eventId: event.id,
      title: event.title,
      source: event.source,
      sourceUrl: event.sourceUrl,
      publishedAt: event.publishedAt,
      detectedAt: event.fetchedAt,
      eventType: primaryType(types),
      status: lifecycleStatus(recency.tier, sourceConfidence.confirmationCount, types),
    },
    classification: { types },
    assets,
    importance,
    sourceConfidence,
    recency: { tier: recency.tier, score: recency.score },
    marketSensitivity,
    score,
  };
}

export function enrichWithIntelligence(event: CatalystEvent, nowMs: number): CatalystEvent {
  try {
    return { ...event, intelligence: analyzeEvent(event, nowMs) };
  } catch {
    return { ...event, intelligence: null };
  }
}
