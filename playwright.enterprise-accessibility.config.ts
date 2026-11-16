import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const STATE_PATH = join(
  __dirname,
  "e2e",
  ".auth",
  "enterprise-a11y-buyer.json",
);

const repoRoot = process.cwd();
const envFile = join(repoRoot, ".env.local");

function loadEnvLocal() {
  const env = { ...process.env };
  if (!existsSync(envFile)) {
    throw new Error(
      ".env.local missing — point SPREE_API_URL at unified API :3021",
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
  env.E2E_PREVIEW = "1";
  env.COOKIE_SECURE = "false";
  if (process.env.ENTERPRISE_A11Y_E2E === "1") {
    env.SPREE_REVIEW_E2E = "0";
    env.SPREE_E2E_BOOTSTRAP_ENABLED = "0";
  } else {
    env.SPREE_REVIEW_E2E = "1";
    env.SPREE_E2E_BOOTSTRAP_ENABLED = "1";
  }
  env.SPREE_MARKETPLACE_LAB_CERT = "1";
  return env;
}

const env = loadEnvLocal();
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = value;
}

const certPort =
  process.env.STOREFRONT_CERT_PORT ||
  (process.env.ENTERPRISE_A11Y_E2E === "1" ? "3405" : undefined);
const siteUrl = certPort
  ? `http://127.0.0.1:${certPort}`
  : env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3305";
const baseURL = siteUrl.replace(/\/$/, "");
const port = new URL(baseURL).port || process.env.STOREFRONT_E2E_PORT || "3305";
process.env.STOREFRONT_E2E_PORT = port;
process.env.NEXT_PUBLIC_SITE_URL = baseURL;
process.env.COOKIE_SECURE = "false";

const buyerStorageState =
  process.env.ENTERPRISE_A11Y_E2E === "1" ? STATE_PATH : undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: process.env.ENTERPRISE_A11Y_PREFLIGHT
    ? "enterprise-accessibility-preflight.spec.ts"
    : "enterprise-accessibility.spec.ts",
  globalSetup:
    process.env.ENTERPRISE_A11Y_E2E === "1"
      ? "./e2e/enterprise-a11y-global-setup.mjs"
      : undefined,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          "../docs/evidence/marketplace-beta/rc-enterprise-accessibility-results.json",
      },
    ],
  ],
  use: {
    baseURL,
    storageState: buyerStorageState,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-pixel",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
});
