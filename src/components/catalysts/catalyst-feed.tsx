import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MarketCardBeam } from "@/components/market/market-card-beam";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CatalystEvent } from "@/types/catalyst";

export function CatalystFeed({ events = [] }: { events?: CatalystEvent[] }) {
  return (
    <section aria-labelledby="catalyst-feed-heading">
      <MarketCardBeam>
        <Card variant="glass-card" lift={false}>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <CardTitle id="catalyst-feed-heading">Important catalysts</CardTitle>
            <SourceStatusBadge status="unavailable" />
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                icon={<Newspaper className="size-5" strokeWidth={1.5} />}
                title="No live catalysts yet"
                description="Connect a news source to begin."
              />
            ) : null}
          </CardContent>
        </Card>
      </MarketCardBeam>
    </section>
  );
}