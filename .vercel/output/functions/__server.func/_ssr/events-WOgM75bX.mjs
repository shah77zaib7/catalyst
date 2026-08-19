import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as PageHeader } from "./page-header-BCM3uYzt.mjs";
import { t as SourceStatusPanel } from "./source-status-panel-BbRyyeBu.mjs";
import { t as UpcomingEvents } from "./upcoming-events-CSxQka0F.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/events-WOgM75bX.js
var import_jsx_runtime = require_jsx_runtime();
function EventsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-6xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "Calendar",
				title: "Events",
				description: "Scheduled economic releases will list here once a calendar source is connected."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UpcomingEvents, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusPanel, { title: "Calendar source" })
		]
	});
}
//#endregion
export { EventsPage as component };
