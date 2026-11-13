import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "unified-quote-checkout.spec.ts",
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/unified-quote-checkout.json" }],
  ],
  use: {
    baseURL:
      process.env.E2E_UNIFIED_STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://127.0.0.1:3305",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
