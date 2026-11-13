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
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = value;
}

const certPort = process.env.STOREFRONT_CERT_PORT || "3407";
const baseURL = `http://127.0.0.1:${certPort}`.replace(/\/$/, "");

process.env.STOREFRONT_E2E_PORT = certPort;
process.env.NEXT_PUBLIC_SITE_URL = baseURL;
process.env.PLAYWRIGHT_REUSE_STOREFRONT = "1";
process.env.E2E_PREVIEW = "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "mobile-pdp.spec.ts",
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "on",
    navigationTimeout: 180_000,
  },
  projects: [{ name: "mobile-pdp", use: { ...devices["Pixel 7"] } }],
});
