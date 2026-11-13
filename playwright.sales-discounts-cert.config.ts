import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = process.cwd();
const envFile = join(
  repoRoot,
  process.env.SALES_DISCOUNTS_CERT_ENV || ".env.sales-discounts-cert",
);

function loadCertEnv() {
  const env = { ...process.env };
  if (!existsSync(envFile)) {
    throw new Error(
      "Missing .env.sales-discounts-cert for sales-discounts certification",
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
  env.MARKETPLACE_E2E_REQUIRED = env.MARKETPLACE_E2E_REQUIRED || "1";
  env.COOKIE_SECURE = env.COOKIE_SECURE || "false";
  env.E2E_PREVIEW = env.E2E_PREVIEW || "1";
  return env;
}

const certEnv = loadCertEnv();
for (const [key, value] of Object.entries(certEnv)) {
  if (value !== undefined) process.env[key] = value;
}

const port =
  certEnv.STOREFRONT_CERT_PORT || certEnv.STOREFRONT_E2E_PORT || "3407";
const baseURL = `http://127.0.0.1:${port}`;
const reuseStorefront = process.env.PLAYWRIGHT_REUSE_STOREFRONT === "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "marketplace-promotions.spec.ts",
  timeout: 600_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/sales-discounts-cert-report.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 120_000,
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  ...(reuseStorefront
    ? {}
    : {
        webServer: {
          command: "node ./scripts/e2e/sales-discounts-cert-preview.mjs start",
          url: `${baseURL}/us/en`,
          reuseExistingServer: false,
          timeout: 180_000,
          stdout: "pipe",
          stderr: "pipe",
          env: {
            ...certEnv,
            E2E_PREVIEW: "1",
            SALES_DISCOUNTS_CERT_ENV:
              process.env.SALES_DISCOUNTS_CERT_ENV ||
              ".env.sales-discounts-cert",
            SPREE_NEXT_DIST_DIR:
              certEnv.SPREE_NEXT_DIST_DIR || process.env.SPREE_NEXT_DIST_DIR,
          },
        },
      }),
});
