import { getIntegrations, type IntegrationSnapshot } from "@/lib/integrations/registry";
import { SOURCE_STATUS_DESCRIPTIONS } from "@/lib/source-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";

function IntegrationRow({ item }: { item: IntegrationSnapshot }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{item.label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
      </div>
      <SourceStatusBadge status={item.sourceStatus} />
    </div>
  );
}

export function SourceStatusPanel({
  title = "Source status",
  description = "Every external integration exposes an explicit status. MOCK and UNAVAILABLE are never presented as live.",
  items,
}: {
  title?: string;
  description?: string;
  items?: IntegrationSnapshot[];
}) {
  const rows = items ?? getIntegrations();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          {rows.map((item) => (
            <IntegrationRow key={item.id} item={item} />
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-subtle">
          {SOURCE_STATUS_DESCRIPTIONS.live} {SOURCE_STATUS_DESCRIPTIONS.unavailable}
        </p>
      </CardContent>
    </Card>
  );
}
