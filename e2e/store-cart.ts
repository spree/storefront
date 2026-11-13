import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { createClient } from "@spree/sdk";
import {
  MARKETPLACE_E2E_REQUIRED,
  storefrontGoto,
} from "./marketplace-fixtures";

export type DiscoveryAttribution = {
  source_type: string;
  list_id?: string | null;
  position?: number | null;
  section?: string | null;
  seller_id?: string | null;
  product_id?: string | null;
  query_id?: string | null;
};

export type CartLineItem = {
  id: string;
  name?: string;
  slug?: string;
  variant_id?: string;
  product_id?: string;
  discovery_attribution?: DiscoveryAttribution;
};

export type StoreCart = {
  id: string;
  token?: string;
  items?: CartLineItem[];
  shipping_address?: { address1?: string | null } | null;
  discount_total?: string | null;
  discounts?: Array<{ code?: string | null; name?: string | null }>;
};

function normalizeSdkBaseUrl(raw: string): string {
  return raw.replace(/\/$/, "").replace(/\/api\/v3\/store$/, "");
}

function normalizeStoreApiBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  return trimmed.endsWith("/api/v3/store")
    ? trimmed
    : `${trimmed}/api/v3/store`;
}

export function loadSpreeEnv(): {
  baseUrl: string;
  publishableKey: string;
  storeApiBaseUrl: string;
} {
  const fromEnv =
    process.env.SPREE_API_URL && process.env.SPREE_PUBLISHABLE_KEY;
  if (fromEnv) {
    const configured = process.env.SPREE_API_URL!;
    return {
      baseUrl: normalizeSdkBaseUrl(configured),
      storeApiBaseUrl: normalizeStoreApiBaseUrl(configured),
      publishableKey: process.env.SPREE_PUBLISHABLE_KEY!,
    };
  }

  const envPath = join(__dirname, "..", ".env.e2e");
  if (!existsSync(envPath)) {
    const message =
      "Missing SPREE_API_URL / SPREE_PUBLISHABLE_KEY (set env or run pnpm run e2e:up).";
    if (MARKETPLACE_E2E_REQUIRED) throw new Error(message);
    throw new Error(message);
  }

  const lines = readFileSync(envPath, "utf8").split("\n");
  const vars: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed
      .slice(eq + 1)
      .replace(/^["']|["']$/g, "");
  }

  if (!vars.SPREE_API_URL || !vars.SPREE_PUBLISHABLE_KEY) {
    throw new Error(`Incomplete ${envPath}`);
  }

  return {
    baseUrl: normalizeSdkBaseUrl(vars.SPREE_API_URL),
    storeApiBaseUrl: normalizeStoreApiBaseUrl(vars.SPREE_API_URL),
    publishableKey: vars.SPREE_PUBLISHABLE_KEY,
  };
}

function cartCookies(page: Page) {
  return page.context().cookies();
}

function storefrontCookieOrigin(page: Page): string {
  if (page.url() && !page.url().startsWith("about:")) {
    return new URL(page.url()).origin;
  }
  const port = process.env.STOREFRONT_E2E_PORT;
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.MERCH_E2E_STOREFRONT_URL ||
    process.env.BASE_URL ||
    (port ? `http://127.0.0.1:${port}` : "http://127.0.0.1:3001");
  return configured.replace(/\/$/, "");
}

/**
 * Aligns with the storefront DTC cart cookies (same channel/surface as UI add-to-cart).
 * Clears any prior cart so the next navigation provisions a fresh incomplete cart.
 */
export async function ensureEmptyStorefrontDtcCart(
  page: Page,
  expectedEmail: string,
): Promise<void> {
  const { baseUrl, publishableKey } = loadSpreeEnv();
  const client = createClient({ baseUrl, publishableKey });
  await storefrontGoto(page, "/us/en");
  const cookies = await cartCookies(page);
  const jwt = cookies.find((cookie) => cookie.name === "_spree_jwt")?.value;
  if (!jwt) throw new Error("Buyer JWT cookie missing after login.");

  const customer = await client.customer.get({ token: jwt });
  if (customer.email?.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error(
      `Authenticated buyer mismatch: expected ${expectedEmail}, got ${customer.email ?? "no email"}.`,
    );
  }

  const incomplete = await client.carts.list({ token: jwt });
  for (const cart of incomplete.data ?? []) {
    if (!cart.id || !cart.token) continue;
    try {
      await client.carts.delete(cart.id, {
        token: jwt,
        spreeToken: cart.token,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/cart not found/i.test(message)) throw error;
    }
  }
  const { hostname } = new URL(storefrontCookieOrigin(page));
  await page.context().clearCookies({
    domain: hostname,
    name: "_spree_cart_token_id",
  });
  await page.context().clearCookies({
    domain: hostname,
    name: "_spree_cart_token",
  });
  await storefrontGoto(page, "/us/en/cart");
  await storefrontGoto(page, "/us/en");
}

/** Verify the buyer session and provision a new empty cart for this browser context. */
export async function startAuthenticatedEmptyCart(
  page: Page,
  expectedEmail: string,
): Promise<string> {
  const { baseUrl, publishableKey } = loadSpreeEnv();
  const client = createClient({ baseUrl, publishableKey });
  const jwt = (await cartCookies(page)).find(
    (cookie) => cookie.name === "_spree_jwt",
  )?.value;
  if (!jwt) throw new Error("Buyer JWT cookie missing after login.");

  const customer = await client.customer.get({ token: jwt });
  if (customer.email?.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error(
      `Authenticated buyer mismatch: expected ${expectedEmail}, got ${customer.email ?? "no email"}.`,
    );
  }

  const cart = (await client.carts.create({}, { token: jwt })) as StoreCart;
  if (!cart.id || !cart.token) {
    throw new Error("Store API did not return both cart ID and cart token.");
  }

  await storefrontGoto(page, "/us/en");
  const origin = storefrontCookieOrigin(page);
  const { hostname } = new URL(origin);
  const cookieSecure =
    process.env.COOKIE_SECURE !== "false" && /^https:/i.test(origin);
  const cookieBase = {
    domain: hostname,
    path: "/",
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "Lax" as const,
  };
  await page.context().addCookies([
    {
      name: "_spree_cart_token_id",
      value: cart.id,
      ...cookieBase,
    },
    {
      name: "_spree_cart_token",
      value: cart.token,
      ...cookieBase,
    },
  ]);
  await storefrontGoto(page, "/us/en");

  const resolved = await client.carts.get(cart.id, {
    token: jwt,
    spreeToken: cart.token,
  });
  if (resolved.items.length !== 0) {
    throw new Error(`Fresh cart ${cart.id} is not empty.`);
  }

  const cookies = await cartCookies(page);
  if (
    cookies.find((cookie) => cookie.name === "_spree_cart_token_id")?.value !==
      cart.id ||
    cookies.find((cookie) => cookie.name === "_spree_cart_token")?.value !==
      cart.token
  ) {
    throw new Error("Fresh cart cookies were not retained by the browser.");
  }
  return cart.id;
}

/** Recheck buyer identity, cart cookie stability, and expected line count. */
export async function assertBuyerCart(
  page: Page,
  expectedEmail: string,
  expectedCartId: string,
  expectedLineCount: number,
): Promise<StoreCart> {
  const { baseUrl, publishableKey } = loadSpreeEnv();
  const cookies = await cartCookies(page);
  const jwt = cookies.find((cookie) => cookie.name === "_spree_jwt")?.value;
  const cartId = cookies.find(
    (cookie) => cookie.name === "_spree_cart_token_id",
  )?.value;
  const spreeToken = cookies.find(
    (cookie) => cookie.name === "_spree_cart_token",
  )?.value;
  if (!jwt || cartId !== expectedCartId || !spreeToken) {
    throw new Error("Authenticated buyer or cart cookies changed during E2E.");
  }

  const client = createClient({ baseUrl, publishableKey });
  const customer = await client.customer.get({ token: jwt });
  if (customer.email?.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error(
      `Buyer session changed to ${customer.email ?? "anonymous"}.`,
    );
  }
  const cart = (await client.carts.get(cartId, {
    token: jwt,
    spreeToken,
  })) as StoreCart;
  if (cart.items?.length !== expectedLineCount) {
    throw new Error(
      `Expected ${expectedLineCount} cart lines, received ${cart.items?.length ?? 0}.`,
    );
  }
  return cart;
}

/** Current DTC cart from Store API (uses browser session cookies). */
export async function fetchStoreCart(page: Page): Promise<StoreCart> {
  const { baseUrl, publishableKey } = loadSpreeEnv();
  const cookies = await cartCookies(page);
  const jwt = cookies.find((c) => c.name === "_spree_jwt")?.value;
  const spreeToken = cookies.find((c) => c.name === "_spree_cart_token")?.value;
  const cartId = cookies.find((c) => c.name === "_spree_cart_token_id")?.value;

  if (!cartId) {
    throw new Error(
      "No cart id cookie (_spree_cart_token_id) — add to cart first.",
    );
  }

  const client = createClient({ baseUrl, publishableKey });
  const cart = await client.carts.get(cartId, {
    token: jwt,
    spreeToken,
  });

  return cart as StoreCart;
}

/** Remove matching fixture lines through the Store API before repeated attribution checks. */
export async function removeStoreCartItemsByName(
  page: Page,
  matches: RegExp,
): Promise<void> {
  const { baseUrl, publishableKey } = loadSpreeEnv();
  const cookies = await cartCookies(page);
  const jwt = cookies.find((cookie) => cookie.name === "_spree_jwt")?.value;
  const spreeToken = cookies.find(
    (cookie) => cookie.name === "_spree_cart_token",
  )?.value;
  const cartId = cookies.find(
    (cookie) => cookie.name === "_spree_cart_token_id",
  )?.value;
  if (!cartId) return;

  const client = createClient({ baseUrl, publishableKey });
  const cart = await client.carts.get(cartId, { token: jwt, spreeToken });
  for (const item of cart.items ?? []) {
    if (matches.test(item.name ?? "")) {
      await client.carts.items.delete(cart.id, item.id, {
        token: jwt,
        spreeToken,
      });
    }
  }
}

/** Reset the dedicated E2E buyer cart before seller attribution assertions. */
export async function removeSellerShopDiscoveryLines(
  page: Page,
): Promise<void> {
  const { baseUrl, publishableKey } = loadSpreeEnv();
  const cookies = await cartCookies(page);
  const jwt = cookies.find((cookie) => cookie.name === "_spree_jwt")?.value;
  const spreeToken = cookies.find(
    (cookie) => cookie.name === "_spree_cart_token",
  )?.value;
  const cartId = cookies.find(
    (cookie) => cookie.name === "_spree_cart_token_id",
  )?.value;
  if (!jwt && !cartId) return;

  const client = createClient({ baseUrl, publishableKey });
  const cartIds = new Set<string>();
  if (cartId) cartIds.add(cartId);
  // Form login does not plant the cart cookie, so the buyer's existing cart
  // is easy to miss. A later add then increments that cart and can be refused
  // once the line is already at the available quantity.
  if (jwt) {
    const response = await client.carts.list({ token: jwt });
    for (const cart of response.data ?? []) {
      if (cart.id) cartIds.add(cart.id);
    }
  }

  for (const id of cartIds) {
    const cart = await client.carts
      .get(id, { token: jwt, spreeToken })
      .catch(() => null);
    if (!cart) continue;
    await client.carts.delete(cart.id, {
      token: jwt,
      spreeToken: cart.token ?? spreeToken,
    });
  }
  await page.context().clearCookies({ name: "_spree_cart_token_id" });
  await page.context().clearCookies({ name: "_spree_cart_token" });
}

export function findLineByListId(
  cart: StoreCart,
  listId: string,
): CartLineItem | undefined {
  return cart.items?.find(
    (line) => line.discovery_attribution?.list_id === listId,
  );
}

export function assertSellerShopAttribution(
  line: CartLineItem,
  options: {
    listId?: string;
    sectionSlug?: string;
    sellerIdFromUrl?: string;
  },
): void {
  const attr = line.discovery_attribution;
  if (!attr) {
    throw new Error(`Line ${line.id} missing discovery_attribution`);
  }
  if (attr.source_type !== "seller_shop") {
    throw new Error(
      `Expected source_type seller_shop, got ${attr.source_type ?? "null"}`,
    );
  }
  if (options.listId && attr.list_id !== options.listId) {
    throw new Error(
      `Expected list_id ${options.listId}, got ${attr.list_id ?? "null"}`,
    );
  }
  if (options.sectionSlug && attr.section !== options.sectionSlug) {
    throw new Error(
      `Expected section ${options.sectionSlug}, got ${attr.section ?? "null"}`,
    );
  }
  if (options.sellerIdFromUrl && attr.seller_id) {
    if (attr.seller_id !== options.sellerIdFromUrl) {
      throw new Error(
        `seller_id ${attr.seller_id} does not match PDP seller ${options.sellerIdFromUrl}`,
      );
    }
  }
  if (!attr.product_id) {
    throw new Error("discovery_attribution.product_id missing on cart line");
  }
}

export function sellerIdFromPdpUrl(url: string): string | undefined {
  const match = url.match(/[?&]seller_id=([^&]+)/);
  return match?.[1];
}

export function listIdFromPdpUrl(url: string): string | undefined {
  const match = url.match(/[?&]list_id=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function queryIdFromPdpUrl(url: string): string | undefined {
  const match = url.match(/[?&]query_id=([^&]+)/);
  return match?.[1];
}

export function positionFromPdpUrl(url: string): number | undefined {
  const match = url.match(/[?&]pos=([^&]+)/);
  if (!match?.[1]) return undefined;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

export function findLineByProductSku(
  cart: StoreCart,
  productSku: string,
  productName?: string,
): CartLineItem | undefined {
  return cart.items?.find(
    (line) =>
      line.slug === productSku ||
      line.name?.includes(productSku) ||
      (productName ? line.name === productName : false),
  );
}

/** Assert a cart line exists for the marketplace dev-dataset product slug. */
export function assertCartContainsProductSlug(
  cart: StoreCart,
  productSlug: string,
): CartLineItem {
  const line = findLineByProductSku(cart, productSlug);
  if (!line) {
    const summary =
      cart.items?.map((item) => ({
        slug: item.slug,
        name: item.name,
      })) ?? [];
    throw new Error(
      `Cart ${cart.id} missing line for slug ${productSlug}. Lines: ${JSON.stringify(summary)}`,
    );
  }
  return line;
}

export function assertSearchAttribution(
  line: CartLineItem,
  options: {
    queryId: string;
    listId?: string;
    position?: number;
    sellerId?: string;
  },
): void {
  const attr = line.discovery_attribution;
  if (!attr) {
    throw new Error(`Line ${line.id} missing discovery_attribution`);
  }
  if (attr.source_type !== "search") {
    throw new Error(
      `Expected source_type search, got ${attr.source_type ?? "null"}`,
    );
  }
  if (attr.query_id !== options.queryId) {
    throw new Error(
      `Expected query_id ${options.queryId}, got ${attr.query_id ?? "null"}`,
    );
  }
  if (options.listId && attr.list_id !== options.listId) {
    throw new Error(
      `Expected list_id ${options.listId}, got ${attr.list_id ?? "null"}`,
    );
  }
  if (options.position !== undefined && attr.position !== options.position) {
    throw new Error(
      `Expected position ${options.position}, got ${attr.position ?? "null"}`,
    );
  }
  if (options.sellerId && attr.seller_id !== options.sellerId) {
    throw new Error(
      `Expected seller_id ${options.sellerId}, got ${attr.seller_id ?? "null"}`,
    );
  }
  if (!attr.product_id) {
    throw new Error("discovery_attribution.product_id missing on cart line");
  }
}
