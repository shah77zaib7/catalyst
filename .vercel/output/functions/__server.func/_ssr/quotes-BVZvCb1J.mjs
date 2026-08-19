import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { n as SourceStatusBadge, r as canDisplayNumericValue } from "./source-status-badge-DOua8azA.mjs";
import { n as CardContent, t as Card } from "./card-DL7rpFSZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/quotes-BVZvCb1J.js
var import_jsx_runtime = require_jsx_runtime();
var ASSET_LABELS = {
	gold: "Gold",
	bitcoin: "Bitcoin",
	ethereum: "Ethereum"
};
var ASSET_TICKERS = {
	gold: "XAU",
	bitcoin: "BTC",
	ethereum: "ETH"
};
function formatPrice(quote) {
	if (!canDisplayNumericValue(quote.sourceStatus) || quote.price == null) return "Market data unavailable";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: quote.currency,
		maximumFractionDigits: 2
	}).format(quote.price);
}
var ASSET_HREF = {
	gold: "/gold",
	bitcoin: "/crypto",
	ethereum: "/crypto"
};
function MarketWatch({ quotes }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4",
		"aria-labelledby": "market-watch-heading",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-end justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				id: "market-watch-heading",
				className: "text-sm font-medium tracking-tight",
				children: "Market state"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: "Prices appear only from LIVE or CACHED sources."
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-4 sm:grid-cols-2",
			children: quotes.map((quote) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketAssetCard, { quote }, quote.asset))
		})]
	});
}
function MarketAssetCard({ quote }) {
	const unreliable = !canDisplayNumericValue(quote.sourceStatus);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: cn(quote.sourceStatus === "mock" && "source-hatch"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "p-5 sm:p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-[0.14em] text-subtle uppercase",
						children: ASSET_TICKERS[quote.asset]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-1 font-display text-2xl font-medium tracking-tight",
						children: ASSET_LABELS[quote.asset]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusBadge, { status: quote.sourceStatus })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: cn("mt-8 text-sm", unreliable ? "text-muted-foreground" : "font-medium tabular-nums"),
					children: formatPrice(quote)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex items-center justify-between gap-3 text-xs text-subtle",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Source: ", quote.source] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: ASSET_HREF[quote.asset],
						className: "font-medium text-foreground underline-offset-4 hover:underline",
						children: ["Open ", ASSET_LABELS[quote.asset]]
					})]
				})
			]
		})
	});
}
/**
* Honest unavailable quote. Price fields are forced to null.
* Future providers must return a real SourceStatus and never invent prices.
*/
function unavailableQuote(asset) {
	return {
		asset,
		price: null,
		currency: "USD",
		changeAbsolute: null,
		changePercent: null,
		asOf: null,
		source: "not connected",
		sourceStatus: "unavailable"
	};
}
/** Strip numbers from quotes that are not live or cached. */
function sanitizeQuote(quote) {
	if (canDisplayNumericValue(quote.sourceStatus)) return quote;
	return {
		...quote,
		price: null,
		changeAbsolute: null,
		changePercent: null
	};
}
function getWatchlistQuotes(assets) {
	return assets.map((asset) => sanitizeQuote(unavailableQuote(asset)));
}
var DASHBOARD_WATCHLIST = ["gold", "bitcoin"];
//#endregion
export { getWatchlistQuotes as i, MarketAssetCard as n, MarketWatch as r, DASHBOARD_WATCHLIST as t };
