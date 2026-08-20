import { useEffect, useRef } from "react";

const BINANCE_WIDGET_SRC =
  "https://public.bnbstatic.com/unpkg/growth-widget/cryptoCurrencyWidget@0.0.24.min.js";

const MARQUEE_ATTRS: Record<string, string> = {
  "data-cmc-ids": "1,1027,52,3408,5426,74,2010,20947,5994,13502,24478,35336",
  "data-theme": "light",
  "data-transparent": "true",
  "data-locale": "en",
  "data-fiat": "USD",
  "data-layout": "banner",
  "data-powered-by": "Powered by",
  "data-disclaimer": "Disclaimer",
};

export function BinanceMarquee() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const marquee = document.createElement("div");
    marquee.className = "binance-widget-marquee";
    for (const [name, value] of Object.entries(MARQUEE_ATTRS)) {
      marquee.setAttribute(name, value);
    }

    const script = document.createElement("script");
    script.src = BINANCE_WIDGET_SRC;
    script.async = true;

    host.append(marquee, script);

    return () => {
      host.replaceChildren();
    };
  }, []);

  return (
    <section className="min-w-0 overflow-hidden" aria-label="Binance crypto marquee">
      <div ref={hostRef} className="min-h-[72px] w-full overflow-hidden" />
      <p className="mt-2 text-[11px] text-subtle">Binance widget · separate from Catalyst quotes</p>
    </section>
  );
}
