import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

const TRADINGVIEW_WIDGET_SRC =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

const XAUUSD_WIDGET_CONFIG = {
  allow_symbol_change: true,
  calendar: false,
  details: false,
  hide_side_toolbar: false,
  hide_top_toolbar: false,
  hide_legend: false,
  hide_volume: false,
  hotlist: false,
  interval: "15",
  locale: "en",
  save_image: true,
  style: "1",
  symbol: "FOREXCOM:XAUUSD",
  theme: "light",
  timezone: "Asia/Karachi",
  backgroundColor: "#ffffff",
  gridColor: "rgba(46, 46, 46, 0.2)",
  watchlist: [],
  withdateranges: true,
  compareSymbols: [],
  studies: [],
  autosize: true,
  show_popup_button: true,
  popup_height: "650",
  popup_width: "1000",
  support_host: "https://www.tradingview.com",
} as const;

export function TradingViewGoldChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget h-full w-full";

    const script = document.createElement("script");
    script.src = TRADINGVIEW_WIDGET_SRC;
    script.type = "text/javascript";
    script.async = true;
    script.text = JSON.stringify(XAUUSD_WIDGET_CONFIG);

    root.append(widget, script);

    return () => {
      root.replaceChildren();
    };
  }, []);

  return (
    <Card variant="glass-card" lift={false} className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-end justify-between gap-3 px-4 pt-4 sm:px-5">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-subtle uppercase">
              FOREXCOM:XAUUSD
            </p>
            <h2 className="mt-1 font-display text-lg font-medium tracking-tight">Gold chart</h2>
          </div>
          <p className="pb-0.5 text-[11px] text-subtle">TradingView · separate from Catalyst quotes</p>
        </div>
        <div className="mt-3 h-[360px] min-w-0 sm:h-[440px] lg:h-[520px]">
          <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
        </div>
        <p className="tradingview-widget-copyright px-4 py-2 text-[11px] text-subtle sm:px-5">
          <a
            href="https://www.tradingview.com/symbols/XAUUSD/?exchange=FOREXCOM"
            rel="noopener nofollow"
            target="_blank"
          >
            XAUUSD chart
          </a>
          <span> by TradingView</span>
        </p>
      </CardContent>
    </Card>
  );
}
