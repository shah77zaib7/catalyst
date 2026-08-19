import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/atmosphere-DN-kz2aQ.js
var import_jsx_runtime = require_jsx_runtime();
function Atmosphere() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "atmosphere",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("picture", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
				media: "(max-width: 767px)",
				type: "image/webp",
				srcSet: "/atmosphere/flower-mobile.webp"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
				media: "(max-width: 767px)",
				srcSet: "/atmosphere/flower-mobile.jpg"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("source", {
				type: "image/webp",
				srcSet: "/atmosphere/flower.webp"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: "/atmosphere/flower.jpg",
				alt: "",
				className: "atmosphere-image",
				width: 1200,
				height: 1500,
				fetchPriority: "high",
				decoding: "async"
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "atmosphere-veil" })]
	});
}
//#endregion
export { Atmosphere as t };
