import { createFileRoute } from "@tanstack/react-router";
import { CatalystFeed } from "@/components/catalysts/catalyst-feed";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { MarketAssetCard } from "@/components/market/market-watch";
import { PageHeader } from "@/components/page-header";
import { getWatchlistQuotes } from "@/lib/market/quotes";

export const Route = createFileRoute("/_app/gold")({
  component: GoldPage,
});

function GoldPage() {
  const [quote] = getWatchlistQuotes(["gold"]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="XAU"
        title="Gold"
        description="Gold-specific quotes, catalysts, and events. Market data is not connected yet."
      />
      <MarketAssetCard quote={quote} />
      <div className="grid gap-4 overflow-visible lg:grid-cols-2">
        <CatalystFeed />
        <UpcomingEvents />
      </div>
    </div>
  );
}
