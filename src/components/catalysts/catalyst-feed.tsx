import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MarketCardBeam } from "@/components/market/market-card-beam";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  INTELLIGENCE_SYMBOL_LABELS,
  NEWS_ASSET_LABELS,
  type CatalystEvent,
  type RecencyTier,
  type SourceStatus,
} from "@/types/catalyst";

function formatPublished(value: string | null): string {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

const RECENCY_LABEL: Record<RecencyTier, string> = {
  VERY_FRESH: "Fresh",
  FRESH: "Fresh",
  RECENT: "Recent",
  AGING: "Aging",
  OLD: "Older",
  ARCHIVE: "Archived",
};

function IntelligenceMeta({ event }: { event: CatalystEvent }) {
  const intel = event.intelligence;
  if (!intel) return null;
  const topAssets = intel.assets.slice(0, 3);

  return (
    <div className="mt-2 space-y-1" aria-label="Event intelligence. Relevance is not a price forecast.">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="default">{intel.importance.tier}</Badge>
        <span className="text-[11px] tabular-nums tracking-wide text-subtle">
          Catalyst score {intel.score.overall}
        </span>
        <span className="text-[11px] text-subtle">{RECENCY_LABEL[intel.recency.tier]}</span>
      </div>
      {topAssets.length > 0 ? (
        <p className="text-[11px] text-subtle">
          {topAssets
            .map(
              (asset) =>
                `${INTELLIGENCE_SYMBOL_LABELS[asset.symbol]} relevance ${Math.round(asset.relevance * 100)}%`,
            )
            .join(" · ")}
        </p>
      ) : null}
      <p className="text-[11px] text-subtle">
        Source confidence {intel.sourceConfidence.tier.replaceAll("_", " ")}
      </p>
    </div>
  );
}

export function CatalystFeed({
  events = [],
  status = "unavailable",
}: {
  events?: CatalystEvent[];
  status?: SourceStatus;
}) {
  return (
    <section aria-labelledby="catalyst-feed-heading">
      <MarketCardBeam>
        <Card variant="glass-card" lift={false}>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle id="catalyst-feed-heading">Important catalysts</CardTitle>
              <p className="mt-1 text-[11px] text-subtle">
                Relevance is event-to-asset, not a price forecast.
              </p>
            </div>
            <SourceStatusBadge status={status} />
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                icon={<Newspaper className="size-5" strokeWidth={1.5} />}
                title="No live catalysts yet"
                description="No provider has returned a usable item. Nothing is invented in the meantime."
              />
            ) : (
              <ul className="divide-y divide-border">
                {events.map((event) => (
                  <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium leading-snug text-foreground">{event.title}</p>
                        <SourceStatusBadge status={event.sourceStatus} />
                      </div>
                      {event.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.summary}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-subtle">
                        {event.source} · {formatPublished(event.publishedAt)}
                        {event.assets.length > 0
                          ? ` · ${event.assets.map((asset) => NEWS_ASSET_LABELS[asset]).join(" ")}`
                          : ""}
                      </p>
                      <IntelligenceMeta event={event} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </MarketCardBeam>
    </section>
  );
}
