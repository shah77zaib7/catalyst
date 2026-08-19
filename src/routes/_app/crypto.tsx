import { createFileRoute } from "@tanstack/react-router";
import { CatalystFeed } from "@/components/catalysts/catalyst-feed";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { MarketWatch } from "@/components/market/market-watch";
import { PageHeader } from "@/components/page-header";
import { getWatchlistQuotes } from "@/lib/market/quotes";

export const Route = createFileRoute("/_app/crypto")({
  component: CryptoPage,
});

function CryptoPage() {
  const quotes = getWatchlistQuotes(["bitcoin", "ethereum"]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Digital assets"
        title="Crypto"
        description="Bitcoin and Ethereum quotes, catalysts, and events. No live market-data provider is connected."
      />
      <MarketWatch quotes={quotes} />
      <div className="grid gap-4 overflow-visible lg:grid-cols-2">
        <CatalystFeed />
        <UpcomingEvents />
      </div>
    </div>
  );
}
