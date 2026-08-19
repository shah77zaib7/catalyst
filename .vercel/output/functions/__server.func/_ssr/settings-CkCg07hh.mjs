import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { i as useCurrentUserState, r as signOut, t as Button } from "./button-DfjYkaSv.mjs";
import { t as PageHeader } from "./page-header-BCM3uYzt.mjs";
import { a as useTheme } from "./router-BnKxsYvQ.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-DL7rpFSZ.mjs";
import { t as SourceStatusPanel } from "./source-status-panel-BbRyyeBu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-CkCg07hh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SegmentedControl({ value, options, onChange, label, className }) {
	const listRef = (0, import_react.useRef)(null);
	const [indicator, setIndicator] = (0, import_react.useState)({
		left: 0,
		width: 0
	});
	(0, import_react.useEffect)(() => {
		const root = listRef.current;
		if (!root) return;
		const measure = () => {
			const active = root.querySelector("[data-active=\"true\"]");
			if (!active) return;
			setIndicator({
				left: active.offsetLeft,
				width: active.offsetWidth
			});
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(root);
		return () => observer.disconnect();
	}, [value, options]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: listRef,
		role: "radiogroup",
		"aria-label": label,
		className: cn("relative grid h-12 rounded-2xl bg-muted/80 p-1", className),
		style: { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": "true",
			className: "surface-glass pointer-events-none absolute top-1 bottom-1 rounded-xl transition-[left,width] duration-[var(--motion-fast)] ease-[var(--ease-spring)]",
			style: {
				left: indicator.left,
				width: indicator.width
			}
		}), options.map((option) => {
			const selected = option.value === value;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				role: "radio",
				"aria-checked": selected,
				"data-active": selected,
				onClick: () => onChange(option.value),
				className: cn("relative z-10 h-full rounded-xl text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]", selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"),
				children: option.label
			}, option.value);
		})]
	});
}
var THEME_OPTIONS = [
	{
		value: "system",
		label: "System"
	},
	{
		value: "dark",
		label: "Dark"
	},
	{
		value: "light",
		label: "Light"
	}
];
function SettingsPage() {
	const { preference, setPreference } = useTheme();
	const { user, isPending } = useCurrentUserState();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-6xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageHeader, {
				eyebrow: "Preferences",
				title: "Settings",
				description: "Appearance, account, and the current status of every external source."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Appearance" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Warm ivory is the default reading surface. Dark is available." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedControl, {
				label: "Theme",
				value: preference,
				options: THEME_OPTIONS,
				onChange: setPreference
			}) })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Account" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Optional sign-in. The product is readable without an account." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
				className: "space-y-3",
				children: isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Checking session…"
				}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						"Signed in as",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: user.displayName ?? user.primaryEmail
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "glass",
					onClick: () => void signOut("/login"),
					children: "Sign out"
				})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "You are not signed in."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "glass",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						children: "Sign in"
					})
				})] })
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceStatusPanel, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "About" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Product contract for Phase 1." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3 text-sm text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Catalyst informs the trader. It does not trade for the trader." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium text-foreground",
						children: "Raw data → deterministic processing → AI interpretation → user"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "No market-data, news, calendar, notification, or AI provider is connected. Unavailable integrations are labeled UNAVAILABLE. Mock data, if ever used, will be labeled MOCK." })
				]
			})] })
		]
	});
}
//#endregion
export { SettingsPage as component };
