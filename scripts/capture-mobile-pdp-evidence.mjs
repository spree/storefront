import { chromium, devices } from "@playwright/test";
import path from "node:path";

const base = process.env.STOREFRONT_E2E_PORT || "3305";
const url = `http://127.0.0.1:${base}/us/en/products/dev-dataset-dev-seller-01-storefront-sku`;
const outDir = path.resolve("..", "docs", "evidence", "marketplace-beta", "mobile-pdp-20261105");

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"] });
const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 60000 });
await page.screenshot({ path: path.join(outDir, "after-mobile-390-above-fold.png"), fullPage: false });
await page.evaluate(() => window.scrollBy(0, 1400));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outDir, "after-mobile-390-sticky-bar.png"), fullPage: false });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 60000 });
await page.screenshot({ path: path.join(outDir, "after-desktop-1440-pdp.png"), fullPage: false });
await browser.close();