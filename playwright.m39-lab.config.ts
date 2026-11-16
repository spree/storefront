import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = process.cwd();
const envFile = join(repoRoot, ".env.local.m39lab");
if (!existsSync(envFile)) {
  throw new Error(
    ".env.local.m39lab missing — lab publishable key not configured",
  );
}
const env: Record<string, string> = { ...process.env } as Record<
  string,
  string
>;
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
for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = value;
}

const port = env.STOREFRONT_M39_E2E_PORT || "3306";
const baseURL = `http://127.0.0.1:${port}`;
env.STOREFRONT_M39_E2E_PORT = port;
env.PORT = port;
env.NEXT_PUBLIC_SITE_URL = baseURL;
env.COOKIE_SECURE = "false";
env.E2E_USE_WEBPACK = "1";
env.SPREE_NEXT_DIST_DIR = ".next-m39-lab";
// Lab cert uses Check-only checkout. An empty value must stay set: deleting the
// key lets Next read `.env.local` and mount Stripe Express, whose developer-tools
// iframe covers the mobile Place Order button.
env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "";
env.STRIPE_PUBLISHABLE_KEY = "";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "m39-lab-authenticity-storefront.spec.ts",
  timeout: 300_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    screenshot: "on",
    trace: "retain-on-failure",
    navigationTimeout: 180_000,
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev -p ${port} --webpack`,
    url: `${baseURL}/us/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    cwd: repoRoot,
    env,
  },
});
