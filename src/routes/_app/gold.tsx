import { createFileRoute } from "@tanstack/react-router";
import { CatalystFeed } from "@/components/catalysts/catalyst-feed";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { MarketAssetCard } from "@/components/market/market-watch";
import { PageHeader } from "@/components/page-header";
import { GOLD_WATCHLIST } from "@/lib/market/instruments";
import { loadMarketQuotes } from "@/lib/market/load-quotes";
import { unavailableQuote } from "@/lib/market/quotes";

export const Route = createFileRoute("/_app/gold")({
  loader: () => loadMarketQuotes({ data: { assets: [...GOLD_WATCHLIST] } }),
  component: GoldPage,
});

function GoldPage() {
  const quotes = Route.useLoaderData();
  const quote = quotes[0] ?? unavailableQuote("gold");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="XAU/USD"
        title="Gold"
        description="Gold quotes from the server-side market-data layer. Numbers appear only when the source is LIVE or CACHED."
      />
      <MarketAssetCard quote={quote} />
      <div className="grid gap-4 overflow-visible lg:grid-cols-2">
        <CatalystFeed />
        <UpcomingEvents />
      </div>
    </div>
  );
}
