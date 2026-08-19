import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as PageHeader } from "./page-header-BCM3uYzt.mjs";
import { t as CatalystFeed } from "./catalyst-feed-BqQ9zJ7M.mjs";
import { t as SourceStatusPanel } from "./source-status-panel-BbRyyeBu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/catalysts-CfyDn-fc.js
var import_jsx_runtime = require_jsx_runtime();
function CatalystsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-6xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "Feed",
				title: "Catalysts",
				description: "News and market-moving items will appear here after a news source is connected. Nothing is invented in the meantime."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CatalystFeed, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusPanel, { title: "News source" })
		]
	});
}
//#endregion
export { CatalystsPage as component };
