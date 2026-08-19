import { createFileRoute } from "@tanstack/react-router";
import { CatalystFeed } from "@/components/catalysts/catalyst-feed";
import { PageHeader } from "@/components/page-header";
import { SourceStatusPanel } from "@/components/source-status/source-status-panel";
import { loadCatalystEvents } from "@/lib/news/load-news";

export const Route = createFileRoute("/_app/catalysts")({
  loader: () => loadCatalystEvents({ data: { limit: 30 } }),
  component: CatalystsPage,
});

function CatalystsPage() {
  const news = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Feed"
        title="Catalysts"
        description="Normalized items from connected news providers. Cached items are never labeled LIVE. Nothing is invented."
      />
      <CatalystFeed events={news.events} status={news.status} />
      <SourceStatusPanel title="News sources" items={news.providers} />
    </div>
  );
}
