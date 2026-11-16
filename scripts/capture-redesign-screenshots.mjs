import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createClient } from "@spree/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = join(__dirname, "..");
const outDir = join(
  storefrontRoot,
  "..",
  "docs",
  "evidence",
  "storefront-redesign",
  "screenshots",
);
const origin = process.env.STOREFRONT_URL || "http://127.0.0.1:3305";
const localePath = "/us/en";

mkdirSync(outDir, { recursive: true });

function loadEnvFile(path) {
  const vars = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    // optional
  }
  return vars;
}

function apiConfig() {
  const env = {
    ...loadEnvFile(join(storefrontRoot, ".env.local")),
    ...process.env,
  };
  const raw = env.SPREE_API_URL || env.NEXT_PUBLIC_SPREE_API_URL;
  const publishableKey =
    env.SPREE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SPREE_PUBLISHABLE_KEY;
  if (!raw || !publishableKey) {
    throw new Error(
      "Missing SPREE_API_URL and SPREE_PUBLISHABLE_KEY in storefront/.env.local",
    );
  }
  const baseUrl = raw.replace(/\/$/, "").replace(/\/api\/v3\/store$/, "");
  return { baseUrl, publishableKey };
}

const viewports = [
  { name: "1280", width: 1280, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
  { name: "360", width: 360, height: 780 },
];

const errors = [];

async function capture(page, slug, url, waitMs = 1200) {
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(waitMs);
  const path = join(outDir, `${slug}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(slug, response?.status() ?? "no-response", path);
}

async function discoverLinks(page) {
  const productHref = await page
    .locator('a[href*="/products/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  const categoryHref = await page
    .locator('a[href*="/c/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  const shopHref = await page
    .locator('a[href*="/sellers/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  const collectionHref = await page
    .locator('a[href*="/collections/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  return { productHref, categoryHref, shopHref, collectionHref };
}

async function seedGuestCart(page) {
  const { baseUrl, publishableKey } = apiConfig();
  const client = createClient({ baseUrl, publishableKey });
  const products = await client.products.list({ limit: 1 });
  const product = products.data?.[0];
  if (!product?.default_variant_id && !product?.variants?.[0]?.id) {
    console.warn("No product variant to fill cart");
    return null;
  }
  const variantId =
    product.default_variant_id || product.variants?.[0]?.id || product.id;
  const cart = await client.carts.create({});
  if (!cart.id || !cart.token) {
    throw new Error("Store API did not return cart id/token");
  }
  await client.carts.items.create(
    cart.id,
    { variant_id: variantId, quantity: 1 },
    { spreeToken: cart.token },
  );
  const host = new URL(origin).hostname;
  await page.context().addCookies([
    {
      name: "_spree_cart_token_id",
      value: cart.id,
      domain: host,
      path: "/",
    },
    {
      name: "_spree_cart_token",
      value: cart.token,
      domain: host,
      path: "/",
    },
  ]);
  return cart.id;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (error) => errors.push(String(error)));

try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "home-1440", `${origin}${localePath}`);

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await capture(page, `home-${vp.name}`, `${origin}${localePath}`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  const { productHref, categoryHref, shopHref, collectionHref } =
    await discoverLinks(page);

  if (collectionHref) {
    const collectionUrl = `${origin}${collectionHref.startsWith("/") ? collectionHref : `/${collectionHref}`}`;
    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, "collection-1440", collectionUrl, 2000);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "collection-390", collectionUrl, 2000);
  }

  if (categoryHref) {
    const categoryUrl = `${origin}${categoryHref.startsWith("/") ? categoryHref : `/${categoryHref}`}`;
    await capture(page, "category-1440", categoryUrl);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "category-390", categoryUrl);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(
    page,
    "search-1440",
    `${origin}${localePath}/products?q=handmade`,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(
    page,
    "search-390",
    `${origin}${localePath}/products?q=handmade`,
  );

  if (productHref) {
    const productUrl = `${origin}${productHref.startsWith("/") ? productHref : `/${productHref}`}`;
    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, "product-1440", productUrl, 1500);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "product-390", productUrl, 1500);
  }

  if (shopHref) {
    const shopUrl = `${origin}${shopHref.startsWith("/") ? shopHref : `/${shopHref}`}`;
    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, "seller-1440", shopUrl, 1500);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "seller-390", shopUrl, 1500);
    const reviewsShopUrl = `${shopUrl}${shopUrl.includes("?") ? "&" : "?"}tab=reviews`;
    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(page, "reviews-1440", reviewsShopUrl, 2000);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "shops-1440", `${origin}${localePath}/shops`);

  await page.context().clearCookies();
  const cartId = await seedGuestCart(page);
  if (cartId) {
    await capture(page, "cart-filled-1440", `${origin}${localePath}/cart`, 2000);
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(page, "cart-filled-390", `${origin}${localePath}/cart`, 2000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await capture(
      page,
      "checkout-1440",
      `${origin}${localePath}/checkout/${cartId}`,
      2500,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await capture(
      page,
      "checkout-390",
      `${origin}${localePath}/checkout/${cartId}`,
      2500,
    );
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "account-1440", `${origin}${localePath}/account`, 1500);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "account-390", `${origin}${localePath}/account`, 1500);
} finally {
  await browser.close();
}

copyFileSync(
  join(outDir, "home-1440.png"),
  join(outDir, "home-editorial-1440.png"),
);
copyFileSync(
  join(outDir, "home-390.png"),
  join(outDir, "home-editorial-390.png"),
);

if (errors.length) {
  console.log("page errors:\n", errors.join("\n"));
} else {
  console.log("no page errors");
}
