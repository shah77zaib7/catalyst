import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { f as BellOff } from "../_libs/lucide-react.mjs";
import { t as EmptyState } from "./empty-state-BFnx6n7W.mjs";
import { t as PageHeader } from "./page-header-BCM3uYzt.mjs";
import { n as SourceStatusBadge } from "./source-status-badge-DOua8azA.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-DL7rpFSZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/alerts-CItsLiKC.js
var import_jsx_runtime = require_jsx_runtime();
function AlertsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-6xl flex-col gap-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
			eyebrow: "Notifications",
			title: "Alerts",
			description: "Alert rules and delivery will live here. Nothing is configured, and no notification channel is connected."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex-row items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Delivery" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusBadge, { status: "unavailable" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellOff, {
				className: "size-5",
				strokeWidth: 1.5
			}),
			title: "No alerts configured",
			description: "Notification delivery is not connected. Catalyst will not invent alert activity."
		}) })] })]
	});
}
//#endregion
export { AlertsPage as component };
