import { createFileRoute } from "@tanstack/react-router";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { PageHeader } from "@/components/page-header";
import { SourceStatusPanel } from "@/components/source-status/source-status-panel";

export const Route = createFileRoute("/_app/events")({
  component: EventsPage,
});

function EventsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Calendar"
        title="Events"
        description="Scheduled economic releases will list here once a calendar source is connected."
      />
      <UpcomingEvents />
      <SourceStatusPanel title="Calendar source" />
    </div>
  );
}
