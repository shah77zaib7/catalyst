import { Link } from "@tanstack/react-router";
import { MarketCardBeam } from "@/components/market/market-card-beam";
import { SourceStatusBadge } from "@/components/source-status/source-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { canDisplayNumericValue } from "@/lib/source-status";
import { cn } from "@/lib/utils";
import { ASSET_LABELS, ASSET_TICKERS, type Asset, type MarketQuote } from "@/types/catalyst";

function formatPrice(quote: MarketQuote): string {
  if (!canDisplayNumericValue(quote.sourceStatus) || quote.price == null) {
    return "Market data unavailable";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: quote.currency,
    maximumFractionDigits: 2,
  }).format(quote.price);
}

const ASSET_HREF: Record<Asset, "/gold" | "/crypto"> = {
  gold: "/gold",
  bitcoin: "/crypto",
  ethereum: "/crypto",
};

export function MarketWatch({ quotes }: { quotes: MarketQuote[] }) {
  return (
    <section className="space-y-4" aria-labelledby="market-watch-heading">
      <div className="flex items-end justify-between gap-3">
        <h2 id="market-watch-heading" className="text-sm font-medium tracking-tight">
          Market state
        </h2>
        <p className="text-xs text-subtle">Prices appear only from LIVE or CACHED sources.</p>
      </div>
      <div className="grid gap-4 overflow-visible sm:grid-cols-2">
        {quotes.map((quote) => (
          <MarketAssetCard key={quote.asset} quote={quote} />
        ))}
      </div>
    </section>
  );
}

export function MarketAssetCard({ quote }: { quote: MarketQuote }) {
  const unreliable = !canDisplayNumericValue(quote.sourceStatus);
  return (
    <MarketCardBeam>
      <Card
        variant="glass-card"
        lift={false}
        className={cn(quote.sourceStatus === "mock" && "source-hatch")}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] text-subtle uppercase">
                {ASSET_TICKERS[quote.asset]}
              </p>
              <h3 className="mt-1 font-display text-2xl font-medium tracking-tight">
                {ASSET_LABELS[quote.asset]}
              </h3>
            </div>
            <SourceStatusBadge status={quote.sourceStatus} />
          </div>
          <p
            className={cn(
              "mt-8 text-sm",
              unreliable ? "text-muted-foreground" : "font-medium tabular-nums",
            )}
          >
            {formatPrice(quote)}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 text-xs text-subtle">
            <span>Source: {quote.source}</span>
            <Link
              to={ASSET_HREF[quote.asset]}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Open {ASSET_LABELS[quote.asset]}
            </Link>
          </div>
        </CardContent>
      </Card>
    </MarketCardBeam>
  );
}
