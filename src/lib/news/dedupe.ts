import type { CatalystEvent } from "../../types/catalyst";
import { canonicalizeUrl } from "./normalize";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeEvents(primary: CatalystEvent, extra: CatalystEvent): CatalystEvent {
  const urls = [...new Set([...primary.sourceUrls, ...extra.sourceUrls].map(canonicalizeUrl))];
  const providers = [...new Set([...primary.providers, ...extra.providers])];
  const assets = [...new Set([...primary.assets, ...extra.assets])];
  const categories = [...new Set([...primary.categories, ...extra.categories])];
  const sourceStatus =
    primary.sourceStatus === "live" || extra.sourceStatus === "live" ? "live" : primary.sourceStatus;

  const publishedCandidates = [primary.publishedAt, extra.publishedAt].filter(
    (value): value is string => Boolean(value),
  );
  publishedCandidates.sort();

  return {
    ...primary,
    summary: primary.summary || extra.summary,
    sourceUrls: urls,
    sourceUrl: urls[0] ?? primary.sourceUrl,
    providers,
    assets,
    categories,
    sourceStatus,
    publishedAt: publishedCandidates[0] ?? null,
    fetchedAt: primary.fetchedAt > extra.fetchedAt ? primary.fetchedAt : extra.fetchedAt,
  };
}

/**
 * Cluster only exact URL matches or exact normalized titles.
 * Similar-but-distinct headlines stay separate.
 */
export function clusterEvents(events: CatalystEvent[]): CatalystEvent[] {
  const byKey = new Map<string, CatalystEvent>();

  for (const event of events) {
    const urlKey = `url:${canonicalizeUrl(event.sourceUrl)}`;
    const titleKey = `title:${normalizeTitle(event.title)}`;
    const existing = byKey.get(urlKey) ?? (titleKey !== "title:" ? byKey.get(titleKey) : undefined);

    if (!existing) {
      byKey.set(urlKey, event);
      if (titleKey !== "title:") byKey.set(titleKey, event);
      continue;
    }

    const merged = mergeEvents(existing, event);
    byKey.set(urlKey, merged);
    if (titleKey !== "title:") byKey.set(titleKey, merged);
    for (const url of merged.sourceUrls) {
      byKey.set(`url:${canonicalizeUrl(url)}`, merged);
    }
  }

  const unique = [...new Set(byKey.values())];
  unique.sort((a, b) => {
    const aTime = a.publishedAt ?? "";
    const bTime = b.publishedAt ?? "";
    return bTime.localeCompare(aTime);
  });
  return unique;
}
