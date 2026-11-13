import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Spree 6 stable upgrade lab — multi-seller browser checkout against API 3020
 * and storefront 3304 (reuseExistingServer).
 */
const repoRoot = process.cwd();
const envFile = join(repoRoot, ".env.local");

function loadEnvLocal() {
  const env = { ...process.env };
  if (!existsSync(envFile)) {
    throw new Error(
      ".env.local not found — lab storefront requires API 3020 settings",
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
  return env;
}

const env = loadEnvLocal();
const apiPort = new URL(env.SPREE_API_URL || "http://invalid").port;
if (apiPort !== "3020") {
  throw new Error(
    `Lab multi-seller browser checkout requires Spree API on port 3020 (got ${apiPort || "missing"})`,
  );
}
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = value;
}

const port = process.env.STOREFRONT_E2E_PORT || "3304";
const baseURL = `http://127.0.0.1:${port}`;
process.env.STOREFRONT_E2E_PORT = port;
process.env.NEXT_PUBLIC_SITE_URL = baseURL;
process.env.COOKIE_SECURE = "false";

export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "multi-seller-cart-mutation.spec.ts",
    "multi-seller-checkout.spec.ts",
  ],
  timeout: 600_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/lab-multi-seller-report.json" }],
  ],
  outputDir: "test-results/lab-multi-seller",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
    navigationTimeout: 180_000,
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
