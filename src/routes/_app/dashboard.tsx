import { createFileRoute } from "@tanstack/react-router";
import { CatalystFeed } from "@/components/catalysts/catalyst-feed";
import { UpcomingEvents } from "@/components/events/upcoming-events";
import { MarketWatch } from "@/components/market/market-watch";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";
import { DASHBOARD_WATCHLIST } from "@/lib/market/instruments";
import { loadMarketQuotes } from "@/lib/market/load-quotes";

export const Route = createFileRoute("/_app/dashboard")({
  loader: () => loadMarketQuotes({ data: { assets: [...DASHBOARD_WATCHLIST] } }),
  component: DashboardPage,
});

function DashboardPage() {
  const quotes = Route.useLoaderData();
  const marketStatus = quotes.some((quote) => quote.sourceStatus === "live")
    ? "live"
    : quotes.some((quote) => quote.sourceStatus === "cached")
      ? "cached"
      : "unavailable";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <header className="enter-fade space-y-3">
        <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
          Personal market intelligence
        </p>
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
          CATALYST
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Market intelligence, without the noise.
        </p>
      </header>

      <div className="enter-fade enter-fade-delay-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Market data</span>
        <SourceStatusBadge status={marketStatus} />
      </div>

      <div className="enter-fade enter-fade-delay-2">
        <MarketWatch quotes={quotes} />
      </div>

      <div className="enter-fade enter-fade-delay-3 grid gap-5 overflow-visible lg:grid-cols-2">
        <CatalystFeed />
        <UpcomingEvents />
      </div>
    </div>
  );
}
