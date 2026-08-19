import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.argv[2] ?? "http://127.0.0.1:8080";
const outDir = "/workspace/screenshots";
await mkdir(outDir, { recursive: true });

const routes = [
  "/dashboard",
  "/catalysts",
  "/events",
  "/gold",
  "/crypto",
  "/alerts",
  "/settings",
  "/login",
];

const required = {
  "/dashboard": ["CATALYST", "Market intelligence, without the noise.", "Market data unavailable", "No live catalysts yet", "No live events yet", "UNAVAILABLE", "Market state"],
  "/catalysts": ["No live catalysts yet", "Connect a news source to begin."],
  "/events": ["No live events yet"],
  "/gold": ["Gold", "Market data unavailable", "UNAVAILABLE"],
  "/crypto": ["Bitcoin", "Ethereum", "Solana", "Market data unavailable"],
  "/alerts": ["No alerts configured"],
  "/settings": ["Appearance", "Source status", "System", "Dark", "Light"],
  "/login": ["Sign in", "Continue without signing in"],
};

const forbidden = [/\$(?:\d{1,3},)+\d{2,}/, /\bNFP\b/, /\bFOMC\b/, /\$67,\d{3}/, /\$108,\d{3}/];

const browser = await chromium.launch({ headless: true });
const errors = [];

async function runPass({ name, viewport, theme }) {
  const context = await browser.newContext({
    viewport,
    colorScheme: theme === "dark" ? "dark" : "light",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${name} ${page.url()} ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(`${name} ${page.url()} ${err.message}`));

  await page.addInitScript((nextTheme) => {
    localStorage.setItem("catalyst-theme", nextTheme);
  }, theme);

  for (const route of routes) {
    const res = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
    const status = res?.status() ?? 0;
    const text = await page.locator("body").innerText();
    if (status >= 400) errors.push(`${name} ${route} status ${status}`);
    for (const snippet of required[route]) {
      if (!text.includes(snippet)) errors.push(`${name} ${route} missing "${snippet}"`);
    }
    for (const pattern of forbidden) {
      if (pattern.test(text)) errors.push(`${name} ${route} matched forbidden ${pattern}`);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    if (overflow && viewport.width <= 400) errors.push(`${name} ${route} horizontal overflow`);
    await page.screenshot({
      path: `${outDir}/${name}${route.replaceAll("/", "-")}.png`,
      fullPage: true,
    });
  }

  if (viewport.width <= 400) {
    await page.goto(`${base}/dashboard`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("navigation", { name: "Primary" }).waitFor();
    const drawerText = await page.getByRole("navigation", { name: "Primary" }).innerText();
    if (!drawerText.includes("Dashboard") || !drawerText.includes("Settings")) {
      errors.push(`${name} drawer missing nav items`);
    }
    await page.screenshot({ path: `${outDir}/${name}-drawer.png` });
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("radio", { name: "Dark" }).click();
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    if (theme === "light" && !htmlClass.includes("dark")) {
      errors.push(`${name} segmented control did not switch to dark`);
    }
  }

  if (consoleErrors.length) errors.push(...consoleErrors);
  if (pageErrors.length) errors.push(...pageErrors);
  await context.close();
}

await runPass({ name: "desktop-light", viewport: { width: 1280, height: 800 }, theme: "light" });
await runPass({ name: "desktop-dark", viewport: { width: 1280, height: 800 }, theme: "dark" });
await runPass({ name: "mobile-light", viewport: { width: 390, height: 844 }, theme: "light" });
await runPass({ name: "mobile-dark", viewport: { width: 390, height: 844 }, theme: "dark" });

const health = await fetch(`${base}/api/health`).then((r) => r.json());
if (!health.ok || health.service !== "catalyst" || health.status !== "healthy") {
  errors.push(`health payload unexpected: ${JSON.stringify(health)}`);
}

await browser.close();

if (errors.length) {
  console.error("QA FAILED");
  for (const error of errors) console.error("-", error);
  process.exit(1);
}

console.log("QA PASSED");
console.log(JSON.stringify({ health, routes, screenshots: outDir }, null, 2));
