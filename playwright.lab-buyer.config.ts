import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import {
  BETA_BUYER_DESKTOP_SPECS,
  BETA_ISOLATED_BUYER_SPECS,
} from "./e2e/beta-isolated-buyer.manifest";

/**
 * Spree 6 stable lab buyer matrix (desktop + optional mobile) against API 3020.
 */
const repoRoot = process.cwd();
const envFile = join(repoRoot, ".env.local");

function loadEnvLocal() {
  const env = { ...process.env };
  if (!existsSync(envFile)) {
    throw new Error(".env.local not found");
  }
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  env.MARKETPLACE_E2E_REQUIRED = "1";
  // Enables /api/e2e/bootstrap-session (Server Action cookie sync) and reviews.smoke.
  env.SPREE_REVIEW_E2E = "1";
  return env;
}

const env = loadEnvLocal();
const apiPort = new URL(env.SPREE_API_URL || "http://invalid").port;
if (apiPort !== "3020") {
  throw new Error(
    `Lab buyer matrix requires API port 3020 (got ${apiPort || "missing"})`,
  );
}
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = value;
}

const port = process.env.STOREFRONT_E2E_PORT || "3304";
const baseURL = `http://127.0.0.1:${port}`;
const desktopOnly = process.env.BETA_BUYER_DESKTOP === "1";
const mobileOnly = process.env.BETA_BUYER_MOBILE === "1";
process.env.STOREFRONT_E2E_PORT = port;
process.env.NEXT_PUBLIC_SITE_URL = baseURL;
process.env.COOKIE_SECURE = "false";
// Match beta-isolated: classic PDP/collection chrome (personalization, ask-about).
process.env.THEME_TEMPLATE_COLLECTION_ENABLED = "0";
process.env.THEME_TEMPLATE_PRODUCT_ENABLED = "0";
env.THEME_TEMPLATE_COLLECTION_ENABLED = "0";
env.THEME_TEMPLATE_PRODUCT_ENABLED = "0";

const testMatch = desktopOnly
  ? [...BETA_BUYER_DESKTOP_SPECS]
  : BETA_ISOLATED_BUYER_SPECS.filter(
      (file) => file !== "multi-seller-checkout.spec.ts",
    );

export default defineConfig({
  testDir: "./e2e",
  testMatch,
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  // One retry absorbs Next.js dev-mode navigation aborts under a long serial suite.
  retries: 1,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: mobileOnly
          ? "test-results/lab-buyer-mobile-report.json"
          : "test-results/lab-buyer-desktop-report.json",
      },
    ],
  ],
  outputDir: mobileOnly
    ? "test-results/lab-buyer-mobile"
    : "test-results/lab-buyer-desktop",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
    navigationTimeout: 180_000,
  },
  projects: mobileOnly
    ? [{ name: "mobile", use: { ...devices["Pixel 7"] } }]
    : [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
