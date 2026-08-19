import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as Newspaper } from "../_libs/lucide-react.mjs";
import { t as EmptyState } from "./empty-state-BFnx6n7W.mjs";
import { n as SourceStatusBadge } from "./source-status-badge-DOua8azA.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-DL7rpFSZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/catalyst-feed-BqQ9zJ7M.js
var import_jsx_runtime = require_jsx_runtime();
function CatalystFeed({ events = [] }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		"aria-labelledby": "catalyst-feed-heading",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex-row items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
				id: "catalyst-feed-heading",
				children: "Important catalysts"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusBadge, { status: "unavailable" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Newspaper, {
				className: "size-5",
				strokeWidth: 1.5
			}),
			title: "No live catalysts yet",
			description: "Connect a news source to begin."
		}) : null })] })
	});
}
//#endregion
export { CatalystFeed as t };
