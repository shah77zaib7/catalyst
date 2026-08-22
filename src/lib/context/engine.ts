import type {
  CatalystEvent,
  ContextRelationship,
  EventContext,
  EventDensity,
  ImportanceTier,
  IntelligenceSymbol,
  IntelligenceType,
  RelatedEventContext,
} from "../../types/catalyst";
import { NEWS_ASSET_TO_SYMBOL } from "../../types/catalyst";
import { eventTimestampMs } from "../reaction/engine";
import {
  CONFIGURED_THEMES,
  DENSITY_WINDOW_MINUTES,
  DENSITY_WINDOW_MS,
  MACRO_THEME_TYPES,
  MAX_RELATED_EVENTS,
  PRE_CONTEXT_MS,
  POST_CONTEXT_MS,
  RANK_POINTS,
  SIMULTANEOUS_MS,
  WIDER_CONTEXT_MS,
} from "./config";

export type IndexedEvent = {
  event: CatalystEvent;
  at: number;
  id: string;
  title: string;
  publishedAt: string;
  assets: IntelligenceSymbol[];
  assetSet: Set<IntelligenceSymbol>;
  types: IntelligenceType[];
  typeSet: Set<IntelligenceType>;
  currencies: IntelligenceSymbol[];
  themes: string[];
  importance: ImportanceTier;
};

export function eventAssets(event: CatalystEvent): IntelligenceSymbol[] {
  const fromIntel = event.intelligence?.assets.map((row) => row.symbol) ?? [];
  if (fromIntel.length > 0) return [...new Set(fromIntel)];
  return [...new Set(event.assets.map((asset) => NEWS_ASSET_TO_SYMBOL[asset]))];
}

export function eventTypes(event: CatalystEvent): IntelligenceType[] {
  const types = event.intelligence?.classification.types ?? [];
  return types.filter((type) => type !== "OTHER");
}

export function eventImportance(event: CatalystEvent): ImportanceTier {
  return event.intelligence?.importance.tier ?? "LOW";
}

export function eventCurrencies(assets: IntelligenceSymbol[]): IntelligenceSymbol[] {
  return assets.includes("USD") || assets.includes("XAUUSD") ? ["USD"] : [];
}

export function eventThemes(types: IntelligenceType[]): string[] {
  const typeSet = new Set(types);
  const themes: string[] = [];
  for (const theme of CONFIGURED_THEMES) {
    if (theme.types.some((type) => typeSet.has(type))) themes.push(theme.id);
  }
  return themes;
}

export function indexEvent(event: CatalystEvent, at: number): IndexedEvent {
  const assets = eventAssets(event);
  const types = eventTypes(event);
  return {
    event,
    at,
    id: event.id,
    title: event.title,
    publishedAt: event.publishedAt ?? new Date(at).toISOString(),
    assets,
    assetSet: new Set(assets),
    types,
    typeSet: new Set(types),
    currencies: eventCurrencies(assets),
    themes: eventThemes(types),
    importance: eventImportance(event),
  };
}

function lowerBound(items: IndexedEvent[], target: number): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].at < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function windowSlice(sorted: IndexedEvent[], at: number, radiusMs: number): IndexedEvent[] {
  return sorted.slice(lowerBound(sorted, at - radiusMs), lowerBound(sorted, at + radiusMs + 1));
}

function formatDistanceReason(distanceSeconds: number): string {
  const abs = Math.abs(distanceSeconds);
  const minutes = Math.round(abs / 60);
  if (abs < 60) {
    if (distanceSeconds === 0) return "occurred at the same timestamp";
    return distanceSeconds > 0 ? `occurred ${abs} seconds after` : `occurred ${abs} seconds before`;
  }
  if (distanceSeconds > 0) return `occurred ${minutes} minute${minutes === 1 ? "" : "s"} after`;
  return `occurred ${minutes} minute${minutes === 1 ? "" : "s"} before`;
}

function intersect<T>(left: T[], rightSet: Set<T>): T[] {
  return left.filter((value) => rightSet.has(value));
}

export function classifyIndexed(
  primary: IndexedEvent,
  related: IndexedEvent,
  distanceSeconds: number,
): {
  relationship: ContextRelationship[];
  reasons: string[];
  sharedAssets: IntelligenceSymbol[];
  sharedThemes: string[];
} {
  const absMs = Math.abs(distanceSeconds) * 1000;
  const sharedAssets = intersect(primary.assets, related.assetSet);
  const sharedTypes = intersect(primary.types, related.typeSet);
  const relatedCurrencySet = new Set(related.currencies);
  const sharedCurrencies = primary.currencies.filter((value) => relatedCurrencySet.has(value));
  const relatedThemeSet = new Set(related.themes);
  const sharedThemes = primary.themes.filter((value) => relatedThemeSet.has(value));
  const relationship: ContextRelationship[] = [];
  const reasons: string[] = [];

  if (absMs <= SIMULTANEOUS_MS) relationship.push("SIMULTANEOUS");
  else if (absMs <= Math.max(PRE_CONTEXT_MS, POST_CONTEXT_MS)) relationship.push("NEARBY");

  if (sharedAssets.length > 0) relationship.push("SAME_ASSET");
  if (sharedTypes.length > 0) relationship.push("SAME_CATEGORY");
  if (sharedThemes.length > 0 || sharedTypes.some((type) => MACRO_THEME_TYPES.includes(type))) {
    relationship.push("SAME_MACRO_THEME");
  }
  if (sharedCurrencies.length > 0) relationship.push("SAME_CURRENCY");
  if (primary.assets.length > 0 && related.assets.length > 0 && sharedAssets.length === 0) {
    relationship.push("CROSS_ASSET");
  }
  if (!relationship.some((tag) => tag !== "NEARBY" && tag !== "SIMULTANEOUS")) {
    relationship.push("UNRELATED" as ContextRelationship);
  }

  reasons.push(formatDistanceReason(distanceSeconds));
  if (absMs <= SIMULTANEOUS_MS) reasons.push(`within ${Math.round(SIMULTANEOUS_MS / 60000)} minutes`);
  for (const asset of sharedAssets) reasons.push(`shares ${asset}`);
  if (sharedTypes.length > 0) reasons.push("same category");
  if (sharedCurrencies.length > 0) reasons.push(`same currency ${sharedCurrencies.join(" ")}`);
  if (sharedThemes.length > 0) reasons.push(`same macro theme ${sharedThemes.join(" ")}`);

  return {
    relationship: [...new Set(relationship)],
    reasons: [...new Set(reasons)],
    sharedAssets,
    sharedThemes,
  };
}

export function classifyRelationship(
  primary: CatalystEvent,
  related: CatalystEvent,
  distanceSeconds: number,
): ReturnType<typeof classifyIndexed> {
  const primaryAt = eventTimestampMs(primary) ?? 0;
  const relatedAt = eventTimestampMs(related) ?? 0;
  return classifyIndexed(indexEvent(primary, primaryAt), indexEvent(related, relatedAt), distanceSeconds);
}

export function rankValue(
  distanceSeconds: number,
  sharedAssets: number,
  sameCategory: boolean,
  sameCurrency: boolean,
  sameMacroTheme: boolean,
  importance: ImportanceTier,
): number {
  const absMs = Math.abs(distanceSeconds) * 1000;
  const proximity =
    absMs <= SIMULTANEOUS_MS
      ? RANK_POINTS.simultaneous
      : absMs <= Math.max(PRE_CONTEXT_MS, POST_CONTEXT_MS)
        ? RANK_POINTS.nearby
        : RANK_POINTS.wider;
  return (
    proximity +
    RANK_POINTS.perSharedAsset * sharedAssets +
    (sameCategory ? RANK_POINTS.sameCategory : 0) +
    (sameCurrency ? RANK_POINTS.sameCurrency : 0) +
    (sameMacroTheme ? RANK_POINTS.sameMacroTheme : 0) +
    RANK_POINTS.importance[importance]
  );
}

function densityOf(nearby: IndexedEvent[], primaryId: string): EventDensity {
  let critical = 0;
  let high = 0;
  let medium = 0;
  for (const row of nearby) {
    if (row.id === primaryId) continue;
    if (row.importance === "CRITICAL") critical += 1;
    else if (row.importance === "HIGH") high += 1;
    else if (row.importance === "MEDIUM") medium += 1;
  }
  return {
    windowMinutes: DENSITY_WINDOW_MINUTES,
    total: critical + high + medium,
    critical,
    high,
    medium,
  };
}

function marketContextOf(event: CatalystEvent): EventContext["marketContext"] {
  const reaction = event.marketReaction;
  if (!reaction || reaction.status === "UNAVAILABLE" || Object.keys(reaction.assets).length === 0) {
    return { status: "UNAVAILABLE", assets: {} };
  }
  const assets: EventContext["marketContext"]["assets"] = {};
  for (const [symbol, row] of Object.entries(reaction.assets)) {
    if (!row) continue;
    assets[symbol as IntelligenceSymbol] = {
      preEventReturnPercent: row.preEvent?.["5mReturnPercent"] ?? null,
      postEvent15mReturnPercent: row.primaryReaction.changePercent,
      postEventDirection: row.primaryReaction.direction,
    };
  }
  const usable = Object.values(assets).some(
    (row) => row && (row.preEventReturnPercent != null || row.postEvent15mReturnPercent != null),
  );
  return { status: usable ? "AVAILABLE" : "UNAVAILABLE", assets: usable ? assets : {} };
}

export function buildContext(primary: IndexedEvent, sorted: IndexedEvent[]): EventContext {
  const wide = windowSlice(sorted, primary.at, WIDER_CONTEXT_MS);
  const densitySlice = windowSlice(sorted, primary.at, DENSITY_WINDOW_MS);
  const candidates: Array<RelatedEventContext & { rank: number; at: number }> = [];
  const seen = new Set<string>([primary.id]);

  for (const row of wide) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const distanceSeconds = Math.round((row.at - primary.at) / 1000);
    const classified = classifyIndexed(primary, row, distanceSeconds);
    candidates.push({
      eventId: row.id,
      title: row.title,
      publishedAt: row.publishedAt,
      distanceSeconds,
      relationship: classified.relationship,
      sharedAssets: classified.sharedAssets,
      sharedThemes: classified.sharedThemes,
      importance: row.importance,
      relevanceReasons: classified.reasons,
      rank: rankValue(
        distanceSeconds,
        classified.sharedAssets.length,
        classified.relationship.includes("SAME_CATEGORY"),
        classified.relationship.includes("SAME_CURRENCY"),
        classified.relationship.includes("SAME_MACRO_THEME"),
        row.importance,
      ),
      at: row.at,
    });
  }

  candidates.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    if (a.at !== b.at) return a.at - b.at;
    return a.eventId.localeCompare(b.eventId);
  });

  const relatedEvents = candidates.slice(0, MAX_RELATED_EVENTS).map(({ rank: _rank, at: _at, ...rest }) => rest);
  const marketContext = marketContextOf(primary.event);
  const eventDensity = densityOf(densitySlice, primary.id);
  const status =
    marketContext.status === "UNAVAILABLE" && relatedEvents.length > 0 ? "PARTIAL" : "AVAILABLE";

  return {
    status,
    relatedEvents,
    eventDensity,
    marketContext,
    reason: null,
  };
}

export function attachEventContext(events: CatalystEvent[]): CatalystEvent[] {
  const indexed: IndexedEvent[] = [];
  for (const event of events) {
    const at = eventTimestampMs(event);
    if (at == null) continue;
    indexed.push(indexEvent(event, at));
  }
  indexed.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const byId = new Map(indexed.map((row) => [row.id, row]));

  return events.map((event) => {
    try {
      const primary = byId.get(event.id);
      if (!primary) {
        return {
          ...event,
          context: {
            status: "UNAVAILABLE",
            relatedEvents: [],
            eventDensity: { windowMinutes: DENSITY_WINDOW_MINUTES, total: 0, critical: 0, high: 0, medium: 0 },
            marketContext: { status: "UNAVAILABLE", assets: {} },
            reason: "missing_event_timestamp",
          },
        };
      }
      return { ...event, context: buildContext(primary, indexed) };
    } catch {
      return {
        ...event,
        context: {
          status: "UNAVAILABLE",
          relatedEvents: [],
          eventDensity: { windowMinutes: DENSITY_WINDOW_MINUTES, total: 0, critical: 0, high: 0, medium: 0 },
          marketContext: { status: "UNAVAILABLE", assets: {} },
          reason: "context_engine_failure",
        },
      };
    }
  });
}
