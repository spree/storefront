import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] === undefined) {
      process.env[key] = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
}

const baseURL = (
  process.env.STOREFRONT_VISUAL_BASE_URL || "http://127.0.0.1:3305"
).replace(/\/$/, "");

export const VISUAL_VIEWPORTS = [
  {
    name: "mobile-375",
    width: 375,
    height: 812,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "mobile-390",
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "tablet-768",
    width: 768,
    height: 1024,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "desktop-1024",
    width: 1024,
    height: 768,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: "desktop-1440",
    width: 1440,
    height: 900,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: "desktop-1920",
    width: 1920,
    height: 1080,
    isMobile: false,
    hasTouch: false,
  },
] as const;

const only = process.env.STOREFRONT_VISUAL_VIEWPORTS?.split(",").map((value) =>
  value.trim(),
);

export default defineConfig({
  testDir: "./e2e/visual",
  timeout: 900_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/storefront-visual",
  use: {
    baseURL,
    navigationTimeout: 120_000,
    trace: "off",
  },
  projects: VISUAL_VIEWPORTS.filter(
    (viewport) => !only || only.includes(viewport.name),
  ).map((viewport) => ({
    name: viewport.name,
    use: {
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      deviceScaleFactor: 1,
    },
  })),
});
