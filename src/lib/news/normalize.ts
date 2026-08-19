import type { CatalystEvent, SourceStatus } from "../../types/catalyst";
import type { RawNewsItem } from "./provider";
import { classifyText } from "./assets";

export function parseIsoDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== "string" || value.trim() === "") return null;

  const raw = value.trim();

  const gdelt = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (gdelt) {
    const iso = `${gdelt[1]}-${gdelt[2]}-${gdelt[3]}T${gdelt[4]}:${gdelt[5]}:${gdelt[6]}.000Z`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const av = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (av) {
    const iso = `${av[1]}-${av[2]}-${av[3]}T${av[4]}:${av[5]}:${av[6]}.000Z`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid|ref)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    let path = parsed.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeRawItem(
  item: RawNewsItem,
  sourceStatus: SourceStatus,
  fetchedAt: string,
): CatalystEvent | null {
  const title = cleanText(item.title);
  const url = cleanText(item.url);
  if (!title || !url) return null;

  const canonical = canonicalizeUrl(url);
  const classification = classifyText(`${title} ${item.summary}`);

  return {
    id: `evt_${stableId(canonical || title)}`,
    title,
    summary: cleanText(item.summary),
    source: cleanText(item.sourceName) || item.providerId,
    sourceUrl: canonical,
    sourceUrls: [canonical],
    publishedAt: item.publishedAt,
    fetchedAt,
    assets: classification.assets,
    categories: classification.categories,
    impact: null,
    sourceStatus,
    providers: [item.providerId],
  };
}

export function stableId(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
