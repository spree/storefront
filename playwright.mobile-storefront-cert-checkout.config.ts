import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = process.cwd();
const envFile = join(repoRoot, ".env.mobile-storefront-cert");

function loadEnvLocal() {
  const env = { ...process.env };
  if (!existsSync(envFile)) {
    throw new Error(".env.mobile-storefront-cert not found");
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
const requiredApiPort = process.env.E2E_UNIFIED_API_PORT || "3031";
if (apiPort !== requiredApiPort) {
  throw new Error(
    `Mobile storefront cert checkout requires API port ${requiredApiPort} (got ${apiPort || "missing"})`,
  );
}
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = value;
}

const certPort = process.env.STOREFRONT_CERT_PORT || "3407";
const baseURL = `http://127.0.0.1:${certPort}`.replace(/\/$/, "");
const preview = process.env.E2E_PREVIEW === "1";

process.env.STOREFRONT_E2E_PORT = certPort;
process.env.NEXT_PUBLIC_SITE_URL = baseURL;
process.env.COOKIE_SECURE = "false";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "checkout.spec.ts",
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/mobile-cert-checkout",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(process.env.PLAYWRIGHT_REUSE_STOREFRONT === "1"
    ? {}
    : {
        webServer: {
          command: preview
            ? `node node_modules/next/dist/bin/next start -p ${certPort}`
            : `node node_modules/next/dist/bin/next dev -p ${certPort} --webpack`,
          url: `${baseURL}/us/en/products/dev-dataset-01-seller-storefront-sku-01-stor`,
          reuseExistingServer: !preview,
          timeout: preview ? 120_000 : 180_000,
          env: preview
            ? {
                ...env,
                NODE_ENV: "production",
                SPREE_NEXT_DIST_DIR: ".next-storefront-cert",
              }
            : { ...env, E2E_USE_WEBPACK: "1" },
          stdout: "pipe",
          stderr: "pipe",
        },
      }),
});
