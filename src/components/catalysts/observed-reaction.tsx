import type { AssetMarketReaction, MarketReaction, ReactionDirection } from "@/types/catalyst";
import { INTELLIGENCE_SYMBOL_LABELS } from "@/types/catalyst";

const ARROW: Record<ReactionDirection, string> = {
  UP: "↑",
  DOWN: "↓",
  FLAT: "→",
  UNKNOWN: "·",
};

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const body = abs >= 1 ? abs.toFixed(2) : abs.toFixed(2);
  if (value > 0) return `+${body}%`;
  if (value < 0) return `-${body}%`;
  return `${body}%`;
}

function strengthLabel(value: string | null | undefined): string {
  if (!value) return "";
  const map: Record<string, string> = {
    VERY_LOW: "Very low reaction",
    LOW: "Low reaction",
    MODERATE: "Moderate reaction",
    HIGH: "High reaction",
    EXTREME: "Extreme reaction",
  };
  return map[value] ?? value;
}

function rows(reaction: MarketReaction): AssetMarketReaction[] {
  return Object.values(reaction.assets).filter((row): row is AssetMarketReaction => Boolean(row));
}

export function ObservedReaction({ reaction }: { reaction?: MarketReaction | null }) {
  if (!reaction) return null;
  if (reaction.status === "UNAVAILABLE") return null;
  const assets = rows(reaction).filter((row) => row.dataQuality.status !== "UNAVAILABLE");
  if (assets.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-border/70 px-3 py-2.5" aria-label="Observed market reaction. Not a forecast.">
      <p className="text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">Observed reaction</p>
      <ul className="mt-2 space-y-1.5">
        {assets.map((asset) => {
          const move = asset.primaryReaction.changePercent;
          return (
            <li key={asset.symbol} className="text-[12px] text-foreground">
              <span className="font-medium">{INTELLIGENCE_SYMBOL_LABELS[asset.symbol]}</span>
              <span className="text-subtle">
                {" "}
                {ARROW[asset.primaryReaction.direction]} {formatPct(move)} · 15m
              </span>
              {asset.primaryReaction.strength ? (
                <span className="block text-[11px] text-subtle">{strengthLabel(asset.primaryReaction.strength)}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <details className="mt-1">
        <summary className="cursor-pointer text-[11px] text-subtle">Details</summary>
        <div className="mt-1 space-y-2 text-[11px] text-subtle">
          {assets.map((asset) => (
            <p key={`${asset.symbol}-detail`}>
              {INTELLIGENCE_SYMBOL_LABELS[asset.symbol]} · pre-event {formatPct(asset.preEvent?.["5mReturnPercent"])}
              {" · "}1h {formatPct(asset.windows["1h"].changePercent)}
              {" · "}max{" "}
              {formatPct(
                asset.maximumMove
                  ? Math.abs(asset.maximumMove.downPercent) >= asset.maximumMove.upPercent
                    ? asset.maximumMove.downPercent
                    : asset.maximumMove.upPercent
                  : null,
              )}
              {" · "}
              {asset.dataQuality.status.toLowerCase()}
            </p>
          ))}
          <p>Observed around the event. Not a prediction, signal, or proof of cause.</p>
        </div>
      </details>
    </div>
  );
}
