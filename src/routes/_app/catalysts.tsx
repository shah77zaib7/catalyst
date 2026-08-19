import { createFileRoute } from "@tanstack/react-router";
import { CatalystFeed } from "@/components/catalysts/catalyst-feed";
import { PageHeader } from "@/components/page-header";
import { SourceStatusPanel } from "@/components/source-status/source-status-panel";

export const Route = createFileRoute("/_app/catalysts")({
  component: CatalystsPage,
});

function CatalystsPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Feed"
        title="Catalysts"
        description="News and market-moving items will appear here after a news source is connected. Nothing is invented in the meantime."
      />
      <CatalystFeed />
      <SourceStatusPanel title="News source" />
    </div>
  );
}
