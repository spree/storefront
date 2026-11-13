import { chromium } from "@playwright/test";
import path from "node:path";
import { mkdirSync } from "node:fs";

const outDir = path.resolve("..", "docs", "evidence", "marketplace-beta", "mobile-storefront-cert-20261105", "visuals");
mkdirSync(outDir, { recursive: true });

const base = process.env.STOREFRONT_CERT_PORT || process.env.STOREFRONT_E2E_PORT || "3407";
const origin = `http://127.0.0.1:${base}`;
const viewports = [375, 390, 430, 768];

const routes = [
  { name: "home", path: "/us/en" },
  { name: "pdp", path: "/us/en/products/dev-dataset-dev-seller-01-storefront-sku" },
  { name: "search", path: "/us/en/search?q=dev" },
  { name: "cart", path: "/us/en/cart" },
  { name: "checkout", path: "/us/en/checkout" },
  { name: "account", path: "/us/en/account" },
  { name: "seller-shop", path: "/us/en/shops/dev-seller-01" },
];

const browser = await chromium.launch();
for (const width of viewports) {
  const height = width >= 768 ? 900 : 812;
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  for (const route of routes) {
    const url = `${origin}${route.path}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if (route.name === "pdp") {
      await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 60_000 }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(outDir, `${route.name}-sticky-${width}.png`),
        fullPage: false,
      });
    }
    await page.screenshot({
      path: path.join(outDir, `${route.name}-${width}.png`),
      fullPage: route.name !== "pdp",
    });
  }
  await context.close();
}
await browser.close();
console.log(`Captured ${viewports.length * routes.length} screenshots under ${outDir}`);