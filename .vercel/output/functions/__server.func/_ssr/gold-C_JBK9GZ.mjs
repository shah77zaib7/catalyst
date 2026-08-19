import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as PageHeader } from "./page-header-BCM3uYzt.mjs";
import { t as CatalystFeed } from "./catalyst-feed-BqQ9zJ7M.mjs";
import { t as UpcomingEvents } from "./upcoming-events-CSxQka0F.mjs";
import { i as getWatchlistQuotes, n as MarketAssetCard } from "./quotes-BVZvCb1J.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/gold-C_JBK9GZ.js
var import_jsx_runtime = require_jsx_runtime();
function GoldPage() {
	const [quote] = getWatchlistQuotes(["gold"]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-6xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "XAU",
				title: "Gold",
				description: "Gold-specific quotes, catalysts, and events. Market data is not connected yet."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketAssetCard, { quote }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CatalystFeed, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpcomingEvents, {})]
			})
		]
	});
}
//#endregion
export { GoldPage as component };
