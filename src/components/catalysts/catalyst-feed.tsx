import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MarketCardBeam } from "@/components/market/market-card-beam";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NEWS_ASSET_LABELS, type CatalystEvent, type SourceStatus } from "@/types/catalyst";

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
            <CardTitle id="catalyst-feed-heading">Important catalysts</CardTitle>
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
