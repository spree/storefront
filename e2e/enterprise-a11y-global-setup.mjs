import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const STATE_PATH = join(__dirname, ".auth", "enterprise-a11y-buyer.json");

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  const map = {};
  if (!existsSync(path)) return map;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return map;
}

export default async function globalSetup() {
  if (process.env.ENTERPRISE_A11Y_E2E !== "1") return;

  const env = loadEnvLocal();
  const apiUrl = (process.env.SPREE_API_URL || env.SPREE_API_URL || "").replace(/\/$/, "");
  const publishableKey =
    process.env.SPREE_PUBLISHABLE_KEY || env.SPREE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY;
  if (!apiUrl.startsWith("http://127.0.0.1:3121")) {
    throw new Error(`Enterprise a11y requires rehearsal API :3121; got ${apiUrl || "missing"}`);
  }
  if (!publishableKey) throw new Error("Missing publishable key in storefront .env.local");

  const baseURL =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    `http://127.0.0.1:${process.env.STOREFRONT_CERT_PORT || "3405"}`;
  const email = process.env.E2E_BUYER_EMAIL || "dev-buyer-001@example.com";
  const password = process.env.E2E_BUYER_PASSWORD || "spree123";

  mkdirSync(dirname(STATE_PATH), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  const loginRes = await page.request.post(`${apiUrl}/api/v3/store/auth/login`, {
    headers: {
      "X-Spree-API-Key": publishableKey,
      "Content-Type": "application/json",
    },
    data: {
      email,
      password,
      turnstile_token: process.env.E2E_TURNSTILE_PASS_TOKEN || "XXXX.DUMMY.TOKEN.XXXX",
    },
  });
  if (!loginRes.ok()) {
    throw new Error(`Buyer login failed: ${loginRes.status()} ${await loginRes.text()}`);
  }
  const { token, refresh_token: refreshToken } = await loginRes.json();
  await page.goto(`${baseURL}/us/en`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const { hostname } = new URL(baseURL);
  await context.addCookies([
    {
      name: "_spree_jwt",
      value: token,
      domain: hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "_spree_refresh_token",
      value: refreshToken,
      domain: hostname,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  await page.reload({ waitUntil: "load", timeout: 120_000 });

  await context.storageState({ path: STATE_PATH });
  await browser.close();

  writeFileSync(
    join(dirname(STATE_PATH), "enterprise-a11y-setup-ok.json"),
    JSON.stringify({ ok: true, at: new Date().toISOString(), baseURL, apiUrl, buildId: readFileSync(join(ROOT, ".next", "BUILD_ID"), "utf8").trim() }, null, 2),
    "utf8",
  );
}
