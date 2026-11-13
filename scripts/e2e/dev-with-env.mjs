/**
 * Boot `next dev` with `.env.e2e` loaded (Playwright webServer, Windows-safe).
 * Mirrors scripts/e2e/dev-with-env.sh without a POSIX shell.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envFile = join(repoRoot, ".env.e2e");

if (!existsSync(envFile)) {
  console.error(
    ".env.e2e not found. Run ./scripts/e2e/bootstrap-spree.sh first.",
  );
  process.exit(1);
}

const env = { ...process.env };
env.E2E_USE_WEBPACK = "1";
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

if (process.env.SALES_DISCOUNTS_CERT === "1") {
  const certApi = process.env.SPREE_API_URL || "http://127.0.0.1:3036";
  env.SPREE_API_URL = certApi;
  env.NEXT_PUBLIC_SPREE_API_URL = certApi;
  if (process.env.SPREE_PUBLISHABLE_KEY) {
    env.SPREE_PUBLISHABLE_KEY = process.env.SPREE_PUBLISHABLE_KEY;
    env.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY = process.env.SPREE_PUBLISHABLE_KEY;
  }
  env.SALES_DISCOUNTS_CERT = "1";
}

const child = spawn("pnpm", ["exec", "next", "dev", "-p", env.STOREFRONT_E2E_PORT || "3001", "--webpack"], {
  cwd: repoRoot,
  env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
