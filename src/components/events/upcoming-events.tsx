import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MarketCardBeam } from "@/components/market/market-card-beam";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EconomicEvent } from "@/types/catalyst";

export function UpcomingEvents({ events = [] }: { events?: EconomicEvent[] }) {
  return (
    <section aria-labelledby="upcoming-events-heading">
      <MarketCardBeam>
        <Card variant="glass-card" lift={false}>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <CardTitle id="upcoming-events-heading">Upcoming events</CardTitle>
            <SourceStatusBadge status="unavailable" />
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                icon={<Calendar className="size-5" strokeWidth={1.5} />}
                title="No live events yet"
                description="An economic calendar source has not been connected."
              />
            ) : null}
          </CardContent>
        </Card>
      </MarketCardBeam>
    </section>
  );
}