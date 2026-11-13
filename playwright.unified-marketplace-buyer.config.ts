import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { BETA_ISOLATED_BUYER_SPECS } from "./e2e/beta-isolated-buyer.manifest";

const repoRoot = process.cwd();
const envFile = join(repoRoot, ".env.local");

const buyerSpecs =
  process.env.BETA_BUYER_INCLUDE_CHECKOUT === "1"
    ? BETA_ISOLATED_BUYER_SPECS
    : BETA_ISOLATED_BUYER_SPECS.filter(
        (file) => file !== "multi-seller-checkout.spec.ts",
      );

function loadEnvLocal() {
  const env = { ...process.env };
  if (!existsSync(envFile)) {
    throw new Error(
      ".env.local not found — set SPREE_API_URL to unified API :3021",
    );
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
  env.SPREE_REVIEW_E2E = "1";
  env.SPREE_E2E_BOOTSTRAP_ENABLED = "1";
  env.SPREE_MARKETPLACE_LAB_CERT = "1";
  return env;
}

const env = loadEnvLocal();
const apiPort = new URL(env.SPREE_API_URL || "http://invalid").port;
const requiredApiPort = process.env.E2E_UNIFIED_API_PORT || "3021";
if (apiPort !== requiredApiPort) {
  throw new Error(
    `Unified buyer matrix requires API port ${requiredApiPort} (got ${apiPort || "missing"})`,
  );
}
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = value;
}

const certPort = process.env.STOREFRONT_CERT_PORT;
const siteUrl = certPort
  ? `http://127.0.0.1:${certPort}`
  : env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3305";
const port = new URL(siteUrl).port || process.env.STOREFRONT_E2E_PORT || "3305";
const baseURL = siteUrl.replace(/\/$/, "");
const desktopOnly = process.env.BETA_BUYER_DESKTOP === "1";
const mobileOnly = process.env.BETA_BUYER_MOBILE === "1";
const preview = process.env.E2E_PREVIEW === "1";

process.env.STOREFRONT_E2E_PORT = port;
process.env.NEXT_PUBLIC_SITE_URL = baseURL;
process.env.COOKIE_SECURE = "false";
process.env.THEME_TEMPLATE_COLLECTION_ENABLED = "0";
process.env.THEME_TEMPLATE_PRODUCT_ENABLED = "0";
env.STOREFRONT_E2E_PORT = port;
env.NEXT_PUBLIC_SITE_URL = baseURL;
env.COOKIE_SECURE = "false";
env.THEME_TEMPLATE_COLLECTION_ENABLED = "0";
env.THEME_TEMPLATE_PRODUCT_ENABLED = "0";

export default defineConfig({
  testDir: "./e2e",
  testMatch: buyerSpecs,
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: desktopOnly
          ? "test-results/unified-buyer-desktop-report.json"
          : mobileOnly
            ? "test-results/unified-buyer-mobile-report.json"
            : "test-results/unified-buyer-full-report.json",
      },
    ],
  ],
  outputDir: desktopOnly
    ? "test-results/unified-buyer-desktop"
    : mobileOnly
      ? "test-results/unified-buyer-mobile"
      : "test-results/unified-buyer-full",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "on",
    navigationTimeout: 180_000,
  },
  projects: mobileOnly
    ? [{ name: "mobile", use: { ...devices["Pixel 7"] } }]
    : desktopOnly
      ? [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }]
      : [
          { name: "desktop", use: { ...devices["Desktop Chrome"] } },
          { name: "mobile", use: { ...devices["Pixel 7"] } },
        ],
  ...(process.env.PLAYWRIGHT_REUSE_STOREFRONT === "1"
    ? {}
    : {
        webServer: {
          command: preview
            ? `node node_modules/next/dist/bin/next start -p ${port}`
            : `node node_modules/next/dist/bin/next dev -p ${port} --webpack`,
          url: `${baseURL}/us/en`,
          reuseExistingServer: !preview,
          timeout: preview ? 120_000 : 180_000,
          env: preview
            ? { ...env, NODE_ENV: "production" }
            : { ...env, E2E_USE_WEBPACK: "1" },
          stdout: "pipe",
          stderr: "pipe",
        },
      }),
});
