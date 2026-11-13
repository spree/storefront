import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envFile = join(
  repoRoot,
  process.env.SALES_DISCOUNTS_CERT_ENV || ".env.sales-discounts-cert",
);
const action = process.argv[2] || "start";

function loadEnvFile() {
  if (!existsSync(envFile)) {
    console.error("Missing .env.sales-discounts-cert");
    process.exit(1);
  }
  const env = { ...process.env };
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
  const port = env.STOREFRONT_CERT_PORT || "3407";
  env.STOREFRONT_CERT_PORT = port;
  env.STOREFRONT_E2E_PORT = port;
  env.PORT = port;
  env.HOSTNAME = "127.0.0.1";
  env.E2E_PREVIEW = "1";
  env.SPREE_E2E_BOOTSTRAP_ENABLED = "1";
  env.SPREE_MARKETPLACE_LAB_CERT = "1";
  env.SALES_DISCOUNTS_CERT = "1";
  env.COOKIE_SECURE = "false";
  env.NODE_ENV = "production";
  env.NEXT_PUBLIC_SITE_URL = `http://127.0.0.1:${port}`;
  if (env.SPREE_API_URL) {
    env.NEXT_PUBLIC_SPREE_API_URL = env.NEXT_PUBLIC_SPREE_API_URL || env.SPREE_API_URL;
  }
  if (env.SPREE_PUBLISHABLE_KEY) {
    env.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY =
      env.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY || env.SPREE_PUBLISHABLE_KEY;
  }
  env.MARKETPLACE_E2E_REQUIRED = env.MARKETPLACE_E2E_REQUIRED || "1";
  return { env, port };
}

function run(command, args, env, cwd = repoRoot) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit", shell: true });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

const { env, port } = loadEnvFile();

if (action === "build") {
  run("pnpm", ["exec", "next", "build"], env);
} else if (action === "start") {
  const distDirName = env.SPREE_NEXT_DIST_DIR || ".next";
  const standaloneDir = join(repoRoot, distDirName, "standalone");
  const serverJs = join(standaloneDir, "server.js");
  if (!existsSync(serverJs)) {
    console.error(`Run build first (missing ${serverJs})`);
    process.exit(1);
  }
  const staticSrc = join(repoRoot, distDirName, "static");
  const staticDst = join(standaloneDir, distDirName, "static");
  const publicSrc = join(repoRoot, "public");
  const publicDst = join(standaloneDir, "public");
  if (existsSync(staticSrc)) {
    mkdirSync(dirname(staticDst), { recursive: true });
    cpSync(staticSrc, staticDst, { recursive: true });
  }
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, publicDst, { recursive: true });
  }
  console.log(`Starting standalone storefront on http://127.0.0.1:${port}`);
  run("node", ["server.js"], env, standaloneDir);
} else {
  console.error(`Unknown action: ${action}`);
  process.exit(1);
}