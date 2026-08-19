import { createFileRoute } from "@tanstack/react-router";
import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/alerts")({
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Notifications"
        title="Alerts"
        description="Alert rules and delivery will live here. Nothing is configured, and no notification channel is connected."
      />
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <CardTitle>Delivery</CardTitle>
          <SourceStatusBadge status="unavailable" />
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<BellOff className="size-5" strokeWidth={1.5} />}
            title="No alerts configured"
            description="Notification delivery is not connected. Catalyst will not invent alert activity."
          />
        </CardContent>
      </Card>
    </div>
  );
}
