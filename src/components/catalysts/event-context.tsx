import type { EventContext } from "@/types/catalyst";
import { INTELLIGENCE_SYMBOL_LABELS } from "@/types/catalyst";

function formatDistance(seconds: number): string {
  const abs = Math.abs(seconds);
  const minutes = Math.round(abs / 60);
  if (abs < 60) return seconds >= 0 ? `${abs}s after` : `${abs}s before`;
  if (seconds > 0) return `${minutes}m after`;
  if (seconds < 0) return `${minutes}m before`;
  return "same time";
}

export function EventContextBlock({ context }: { context?: EventContext | null }) {
  if (!context || context.status === "UNAVAILABLE") return null;
  const related = context.relatedEvents;
  const density = context.eventDensity;
  const marketAssets = Object.entries(context.marketContext.assets);
  const show = related.length > 0 || density.total > 0;
  if (!show) return null;

  const highNearby = density.high + density.critical;
  const activeAssets = [
    ...new Set(related.flatMap((row) => row.sharedAssets).map((symbol) => INTELLIGENCE_SYMBOL_LABELS[symbol])),
  ].slice(0, 3);

  return (
    <div className="mt-3 rounded-2xl border border-border/70 px-3 py-2.5" aria-label="Event context. Nearby events are not proof of cause.">
      <p className="text-[10px] font-medium tracking-[0.16em] text-subtle uppercase">Context</p>
      <p className="mt-1.5 text-[12px] text-foreground">
        {related.length} related event{related.length === 1 ? "" : "s"}
        {highNearby > 0 ? ` · ${highNearby} high-impact nearby` : ""}
      </p>
      {activeAssets.length > 0 ? (
        <p className="text-[11px] text-subtle">{activeAssets.join(" + ")} also active</p>
      ) : null}
      <details className="mt-1">
        <summary className="cursor-pointer text-[11px] text-subtle">Details</summary>
        <div className="mt-1 space-y-2 text-[11px] text-subtle">
          {related.slice(0, 5).map((row) => (
            <p key={row.eventId}>
              {row.title} · {formatDistance(row.distanceSeconds)}
              {row.sharedAssets.length > 0 ? ` · shares ${row.sharedAssets.join(" ")}` : ""}
            </p>
          ))}
          <p>
            Density ±{density.windowMinutes}m: {density.total} meaningful
            {density.critical ? ` · ${density.critical} critical` : ""}
            {density.high ? ` · ${density.high} high` : ""}
          </p>
          {marketAssets.length > 0 ? (
            <div>
              {marketAssets.map(([symbol, row]) =>
                row ? (
                  <p key={symbol}>
                    {INTELLIGENCE_SYMBOL_LABELS[symbol as keyof typeof INTELLIGENCE_SYMBOL_LABELS]} observed
                    alongside 15m {row.postEvent15mReturnPercent == null ? "—" : `${row.postEvent15mReturnPercent.toFixed(2)}%`}
                    {row.postEventDirection !== "UNKNOWN" ? ` ${row.postEventDirection}` : ""}
                  </p>
                ) : null,
              )}
            </div>
          ) : (
            <p>Market context unavailable</p>
          )}
          <p>Nearby occurrence is not evidence that one event caused another.</p>
        </div>
      </details>
    </div>
  );
}
