import { createFileRoute } from "@tanstack/react-router";
import { CatalystFeed } from "@/components/catalysts/catalyst-feed";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { MarketWatch } from "@/components/market/market-watch";
import { TradingViewCryptoChart } from "@/components/market/tradingview-chart";
import { PageHeader } from "@/components/page-header";
import { CRYPTO_WATCHLIST } from "@/lib/market/instruments";
import { loadMarketQuotes } from "@/lib/market/load-quotes";
import { loadCatalystEvents } from "@/lib/news/load-news";

export const Route = createFileRoute("/_app/crypto")({
  loader: async () => {
    const [quotes, news] = await Promise.all([
      loadMarketQuotes({ data: { assets: [...CRYPTO_WATCHLIST] } }),
      loadCatalystEvents({ data: { assets: ["btc", "eth", "sol"], limit: 8 } }),
    ]);
    return { quotes, news };
  },
  component: CryptoPage,
});

function CryptoPage() {
  const { quotes, news } = Route.useLoaderData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        eyebrow="Digital assets"
        title="Crypto"
        description="Bitcoin, Ethereum, and Solana quotes from the server-side market-data layer. Numbers appear only when the source is LIVE or CACHED."
      />
      <MarketWatch quotes={quotes} />
      <div className="grid gap-4 overflow-visible lg:grid-cols-2">
        <CatalystFeed events={news.events} status={news.status} />
        <UpcomingEvents />
      </div>
      <TradingViewCryptoChart />
    </div>
  );
}
