import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.beta-isolated.config";

/**
 * Isolated beta stack — multi-seller checkout only (excluded from default testMatch).
 *
 * Reuse an already-running dev server (same storefront tree — only one Next dev allowed):
 *   PLAYWRIGHT_REUSE_STOREFRONT=1 STOREFRONT_E2E_PORT=3309 pnpm exec playwright test -c playwright.beta-multi-seller.config.ts
 */
const reuseStorefront = process.env.PLAYWRIGHT_REUSE_STOREFRONT === "1";
const config = { ...baseConfig } as typeof baseConfig & { webServer?: unknown };
if (reuseStorefront) {
  delete config.webServer;
}

export default defineConfig({
  ...config,
  testMatch: [
    "multi-seller-cart-mutation.spec.ts",
    "multi-seller-checkout.spec.ts",
  ],
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
