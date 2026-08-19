import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as SourceStatusBadge, t as SOURCE_STATUS_DESCRIPTIONS } from "./source-status-badge-DOua8azA.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-DL7rpFSZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/source-status-panel-BbRyyeBu.js
var import_jsx_runtime = require_jsx_runtime();
var INTEGRATIONS = [
	{
		id: "market-data",
		label: "Market data",
		sourceStatus: "unavailable",
		detail: "No market-data provider is connected.",
		lastUpdated: null
	},
	{
		id: "news",
		label: "News",
		sourceStatus: "unavailable",
		detail: "No news source is connected.",
		lastUpdated: null
	},
	{
		id: "calendar",
		label: "Economic calendar",
		sourceStatus: "unavailable",
		detail: "No calendar source is connected.",
		lastUpdated: null
	},
	{
		id: "alerts",
		label: "Alerts",
		sourceStatus: "unavailable",
		detail: "Notification delivery is not connected.",
		lastUpdated: null
	},
	{
		id: "ai",
		label: "AI interpretation",
		sourceStatus: "unavailable",
		detail: "AI analysis is not connected.",
		lastUpdated: null
	}
];
function IntegrationRow({ item }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start justify-between gap-4 border-t border-border py-3.5 first:border-t-0 first:pt-0 last:pb-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium",
				children: item.label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-sm text-muted-foreground",
				children: item.detail
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusBadge, { status: item.sourceStatus })]
	});
}
function SourceStatusPanel({ title = "Source status", description = "Every external integration exposes an explicit status. MOCK and UNAVAILABLE are never presented as live." }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: title }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: description })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: INTEGRATIONS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntegrationRow, { item }, item.id)) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "mt-4 text-xs leading-relaxed text-subtle",
		children: [
			SOURCE_STATUS_DESCRIPTIONS.live,
			" ",
			SOURCE_STATUS_DESCRIPTIONS.unavailable
		]
	})] })] });
}
//#endregion
export { SourceStatusPanel as t };
