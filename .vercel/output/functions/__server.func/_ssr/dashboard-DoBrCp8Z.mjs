import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as SourceStatusBadge } from "./source-status-badge-DOua8azA.mjs";
import { t as CatalystFeed } from "./catalyst-feed-BqQ9zJ7M.mjs";
import { t as UpcomingEvents } from "./upcoming-events-CSxQka0F.mjs";
import { i as getWatchlistQuotes, r as MarketWatch, t as DASHBOARD_WATCHLIST } from "./quotes-BVZvCb1J.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-DoBrCp8Z.js
var import_jsx_runtime = require_jsx_runtime();
function DashboardPage() {
	const quotes = getWatchlistQuotes(DASHBOARD_WATCHLIST);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-6xl flex-col gap-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "enter-fade space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-[0.18em] text-subtle uppercase",
						children: "Personal market intelligence"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-4xl font-medium tracking-tight sm:text-5xl",
						children: "CATALYST"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-xl text-base text-muted-foreground",
						children: "Market intelligence, without the noise."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "enter-fade enter-fade-delay-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "External sources" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusBadge, { status: "unavailable" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "enter-fade enter-fade-delay-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketWatch, { quotes })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "enter-fade enter-fade-delay-3 grid gap-5 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CatalystFeed, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpcomingEvents, {})]
			})
		]
	});
}
//#endregion
export { DashboardPage as component };
