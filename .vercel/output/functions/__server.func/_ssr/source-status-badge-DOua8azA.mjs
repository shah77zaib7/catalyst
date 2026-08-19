import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { n as TooltipContent, r as TooltipTrigger, t as Tooltip } from "./router-BnKxsYvQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/source-status-badge-DOua8azA.js
var import_jsx_runtime = require_jsx_runtime();
var SOURCE_STATUS_LABELS = {
	live: "LIVE",
	cached: "CACHED",
	mock: "MOCK",
	unavailable: "UNAVAILABLE"
};
var SOURCE_STATUS_DESCRIPTIONS = {
	live: "Fresh data from a connected provider.",
	cached: "Last known good data. Timestamp is required.",
	mock: "Synthetic data for development only. Never treat as market truth.",
	unavailable: "No connected source. No values are shown."
};
/** Statuses that may surface a numeric value in the UI. */
function canDisplayNumericValue(status) {
	return status === "live" || status === "cached";
}
var badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium tracking-[0.1em] uppercase", {
	variants: { variant: {
		default: "bg-muted text-muted-foreground",
		live: "bg-status-live/10 text-status-live-fg",
		cached: "bg-status-cached/12 text-status-cached-fg",
		mock: "source-hatch bg-muted text-status-mock-fg",
		unavailable: "border border-dashed border-status-unavailable/45 bg-transparent text-status-unavailable-fg"
	} },
	defaultVariants: { variant: "default" }
});
var DOT = {
	default: "bg-muted-foreground",
	live: "bg-status-live",
	cached: "bg-status-cached",
	mock: "bg-status-mock",
	unavailable: "bg-status-unavailable"
};
function Badge({ className, variant = "default", children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": "true",
			className: cn("size-1.5 shrink-0 rounded-full", DOT[variant ?? "default"])
		}), children]
	});
}
var VARIANT = {
	live: "live",
	cached: "cached",
	mock: "mock",
	unavailable: "unavailable"
};
function SourceStatusBadge({ status, className, showTooltip = true }) {
	const badge = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: VARIANT[status],
		className: cn("align-middle", className),
		"aria-label": `Source status: ${SOURCE_STATUS_LABELS[status]}`,
		children: SOURCE_STATUS_LABELS[status]
	});
	if (!showTooltip) return badge;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "inline-flex",
			children: badge
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: SOURCE_STATUS_DESCRIPTIONS[status] })] });
}
//#endregion
export { SourceStatusBadge as n, canDisplayNumericValue as r, SOURCE_STATUS_DESCRIPTIONS as t };
