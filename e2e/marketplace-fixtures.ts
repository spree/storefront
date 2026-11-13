import { expect, type Page, test } from "@playwright/test";

/** Lab Store API bases used by Playwright certification (not production). */
export const LAB_STORE_API_URLS = [
  "http://127.0.0.1:3011",
  "http://127.0.0.1:3020",
  "http://127.0.0.1:3021",
  "http://127.0.0.1:3031",
  "http://127.0.0.1:3036",
] as const;

export function requireLabStoreApiUrl(): (typeof LAB_STORE_API_URLS)[number] {
  const url = process.env.SPREE_API_URL;
  if (
    !url ||
    !LAB_STORE_API_URLS.includes(url as (typeof LAB_STORE_API_URLS)[number])
  ) {
    throw new Error(
      `Playwright requires a lab SPREE_API_URL (${LAB_STORE_API_URLS.join(", ")}); got ${url ?? "missing"}`,
    );
  }
  return url as (typeof LAB_STORE_API_URLS)[number];
}

/** Next.js dev mode often never reaches `load`; `domcontentloaded` is enough locally. */
export async function storefrontGoto(
  page: Page,
  path: string,
  options?: Parameters<Page["goto"]>[1],
) {
  // Lab buyer matrices must not inherit CI=`load` — a stuck compile then burns
  // the whole 5-minute test budget across goto retries.
  const { waitUntil: _ignoredWaitUntil, ...rest } = options ?? {};
  const gotoOptions = {
    ...rest,
    waitUntil: "domcontentloaded" as const,
    timeout: rest.timeout ?? 90_000,
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await page.goto(path, gotoOptions);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        /ERR_ABORTED|frame was detached|Navigation interrupted|net::ERR_/i.test(
          message,
        );
      if (!retryable || attempt === 1) throw error;
      await page.waitForTimeout(1_500);
    }
  }
  throw lastError;
}

/** Opens account privacy settings after the authenticated form is ready (slow under beta load). */
export async function openPrivacySettings(page: Page) {
  const { syncBuyerSessionFromCookies } = await import("./buyer-auth");
  const { storeApiFetch } = await import("./store-api");
  await syncBuyerSessionFromCookies(page);
  await storefrontGoto(page, "/us/en/account/settings/privacy");
  await expect
    .poll(
      async () => {
        const response = await storeApiFetch(page, "GET", "customers/me");
        return response.ok;
      },
      { timeout: 90_000 },
    )
    .toBe(true);
  const recommendations = page.locator("#personalized-recommendations");
  const advertising = page.locator("#behavioral-advertising");
  await expect(recommendations).toBeVisible({ timeout: 60_000 });
  await expect(advertising).toBeVisible({ timeout: 60_000 });
  return { recommendations, advertising };
}

/** Reloads privacy settings and re-bootstrap session cookies for Server Actions. */
export async function reloadPrivacySettings(
  page: Page,
  expected?: {
    personalization_enabled?: boolean;
    behavioral_advertising_enabled?: boolean;
  },
) {
  const { syncBuyerSessionFromCookies } = await import("./buyer-auth");
  const { storeApiFetch } = await import("./store-api");
  await page.reload({ waitUntil: "load" });
  await syncBuyerSessionFromCookies(page);
  if (
    expected?.personalization_enabled !== undefined ||
    expected?.behavioral_advertising_enabled !== undefined
  ) {
    await expect
      .poll(
        async () => {
          const response = await storeApiFetch(page, "GET", "customers/me");
          if (!response.ok) return null;
          const customer = await response.json();
          if (
            expected.personalization_enabled !== undefined &&
            customer.personalization_enabled !==
              expected.personalization_enabled
          ) {
            return null;
          }
          if (
            expected.behavioral_advertising_enabled !== undefined &&
            customer.behavioral_advertising_enabled !==
              expected.behavioral_advertising_enabled
          ) {
            return null;
          }
          return customer;
        },
        { timeout: 90_000 },
      )
      .toBeTruthy();
  }
  const recommendations = page.locator("#personalized-recommendations");
  const advertising = page.locator("#behavioral-advertising");
  await expect(recommendations).toBeVisible({ timeout: 60_000 });
  await expect(advertising).toBeVisible({ timeout: 60_000 });
  return { recommendations, advertising };
}

/** Saves privacy personalization toggles and waits until the Store API reflects the change. */
export async function savePrivacySettings(
  page: Page,
  expected?: {
    personalization_enabled?: boolean;
    behavioral_advertising_enabled?: boolean;
  },
) {
  const { syncBuyerSessionFromCookies } = await import("./buyer-auth");
  const { storeApiFetch } = await import("./store-api");
  await syncBuyerSessionFromCookies(page);
  const saveButton = page.getByRole("button", { name: /^save settings$/i });
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.click();
  await expect(saveButton).not.toHaveText(/saving/i, { timeout: 120_000 });
  await expect
    .poll(
      async () => {
        const response = await storeApiFetch(page, "GET", "customers/me");
        if (!response.ok) return null;
        const customer = await response.json();
        if (
          expected?.personalization_enabled !== undefined &&
          customer.personalization_enabled !== expected.personalization_enabled
        ) {
          return null;
        }
        if (
          expected?.behavioral_advertising_enabled !== undefined &&
          customer.behavioral_advertising_enabled !==
            expected.behavioral_advertising_enabled
        ) {
          return null;
        }
        return customer;
      },
      { timeout: 90_000 },
    )
    .toBeTruthy();
}

/** Dev overlay portals intercept clicks against `next dev`; preview/CI builds omit them. */
export async function prepareStorefrontPage(page: Page) {
  if (process.env.CI) {
    return;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3305";
  const { hostname } = new URL(siteUrl);
  await page.context().clearCookies({ domain: hostname, path: "/" });
  await page.addInitScript(() => {
    const removeDevOverlay = () => {
      document.querySelectorAll("nextjs-portal").forEach((node) => {
        node.remove();
      });
    };
    const observeDocument = () => {
      const root = document.documentElement;
      if (!root) {
        document.addEventListener("DOMContentLoaded", observeDocument, {
          once: true,
        });
        return;
      }

      removeDevOverlay();
      const observer = new MutationObserver(removeDevOverlay);
      observer.observe(root, { childList: true, subtree: true });
    };
    observeDocument();
  });
}

/** When set, marketplace promotion E2E must not skip for missing seed data. */
export const MARKETPLACE_E2E_REQUIRED =
  process.env.MARKETPLACE_E2E_REQUIRED === "1";

/** Pre-purchase messaging buyer — must stay unblocked with Seller A after dataset seed. */
export const MARKETPLACE_BUYER_EMAIL = "dev-buyer-001@example.com";
export const MARKETPLACE_BUYER_PASSWORD = "spree123";

/** Trust & Safety Playwright buyer — general messaging with Seller A allowed at seed. */
export const TRUST_SAFETY_BUYER_EMAIL = "dev-buyer-002@example.com";
export const TRUST_SAFETY_BUYER_PASSWORD = "spree123";

export const SELLER_A_PRODUCT_SLUG = "dev-dataset-dev-seller-01-storefront-sku";
export const SELLER_B_PRODUCT_SLUG = "dev-dataset-dev-seller-02-storefront-sku";

export const MARKETPLACE_PRODUCT_A = `/us/en/products/${SELLER_A_PRODUCT_SLUG}`;
export const MARKETPLACE_PRODUCT_B = `/us/en/products/${SELLER_B_PRODUCT_SLUG}`;

export const SELLER_A_SLUG = "dev-seller-01";
export const SELLER_A_SHOP_PATH = `/us/en/sellers/${SELLER_A_SLUG}`;
export const SELLER_A_PRODUCT_PATH = MARKETPLACE_PRODUCT_A;

const SELLER_STOREFRONT_SETUP =
  "Seller storefront dataset missing. From server/: bin/rails spree:marketplace:seed_dev_dataset && bin/rails spree:marketplace:seed_seller_storefront";

export const MARKETPLACE_COUPON_MARKETPLACE = "RDEVMKT10";
export const MARKETPLACE_COUPON_SELLER_B = "RDEVSELLERB5";

/** Deterministic merchandising signal fixtures (Buyer A). */
export const MERCH_BUYER_A_EMAIL = "dev-merch-buyer-a@example.com";
/** Deterministic merchandising signal fixtures (Buyer B). */
export const MERCH_BUYER_B_EMAIL = "dev-merch-buyer-b@example.com";
export const ADAPTIVE_BUYER_C_EMAIL = "dev-adaptive-buyer-c@example.com";
export const ADAPTIVE_BUYER_D_EMAIL = "dev-adaptive-buyer-d@example.com";
export const MERCH_BUYER_PASSWORD = "spree123";
export const MERCH_COLLECTION_PATH = "/us/en/collections/merchandising-signals";
export const MERCH_SKUS = {
  lowStock: "dev-merch-low-stock-1",
  priority: "dev-merch-priority",
  bestseller: "dev-merch-bestseller",
  bestsellerControl: "dev-merch-bestseller-control",
  new: "dev-merch-new",
  notNew: "dev-merch-not-new",
  topShopYes: "dev-merch-top-shop-yes",
  topShopNo: "dev-merch-top-shop-no",
  favoriteSeed: "dev-merch-favorite-seed",
  relatedFavorite: "dev-merch-related-favorite",
  searchMatch: "dev-merch-search-match",
  followed: "dev-merch-followed",
  restock: "dev-merch-restock",
  priceDrop: "dev-merch-price-drop",
  cartInterest: "dev-merch-cart-interest",
  cartInterestControl: "dev-merch-cart-interest-control",
  popularNow: "dev-merch-popular-now",
  popularNowControl: "dev-merch-popular-now-control",
  newFromFollowed: "dev-merch-new-followed",
  purchaseSeed: "dev-merch-purchase-seed",
  similarPurchase: "dev-merch-similar-purchase",
  complementary: "dev-merch-complementary",
  viewedSeed: "dev-merch-viewed-seed",
  viewedSimilar: "dev-merch-viewed-similar",
  categoryBoost: "dev-merch-category-boost",
  categoryControl: "dev-merch-category-control",
  sellerShopAffinity: "dev-merch-seller-affinity",
  sellerShopBaseline: "dev-merch-seller-baseline",
} as const;

export const MERCH_SELLER_A_SLUG = "dev-merch-seller-a";
export const MERCH_SELLER_A_SHOP_PATH = `/us/en/sellers/${MERCH_SELLER_A_SLUG}`;
export const MERCH_SELLER_SHOP_E2E_SECTION = "merch-seller-shop-e2e";
export const MERCH_SELLER_A_SHOP_PRODUCTS_PATH = `${MERCH_SELLER_A_SHOP_PATH}?tab=products&section=${MERCH_SELLER_SHOP_E2E_SECTION}`;
export const MERCH_FAVORITE_SEED_PATH = `/us/en/products/${MERCH_SKUS.favoriteSeed}`;
export const MERCH_HOME_PATH = "/us/en";

/** Shared search term where boost/control titles match equally; affinity ranking is category-based. */
export const MERCH_CATEGORY_SEARCH_QUERY = "tray+pair";

/** Narrows walnut search to the merchandising fixture SKU (avoids ads filler products). */
export const MERCH_WALNUT_SEARCH_QUERY = "merch+walnut+board";

const DATASET_SETUP = `Marketplace dev dataset missing. From server/: bin/rails spree:marketplace:seed_dev_dataset`;
const MERCH_SETUP =
  process.env.MERCH_E2E_LOCALHOST === "1"
    ? "Merchandising fixtures missing. Run: node ./scripts/e2e/bootstrap-merchandising-localhost.mjs"
    : `${DATASET_SETUP} (includes merchandising signal fixtures)`;

let marketplaceDatasetVerified = false;
let sellerStorefrontDatasetVerified = false;

/**
 * Ensures canonical marketplace dev products exist before promotion E2E.
 * Skips locally when seed is absent; fails in required mode.
 */
export async function ensureMarketplaceDataset(page: Page) {
  if (marketplaceDatasetVerified) {
    return;
  }
  const response = await storefrontGoto(page, MARKETPLACE_PRODUCT_A);
  const missing = !response || response.status() === 404;

  if (!missing) {
    marketplaceDatasetVerified = true;
    return;
  }

  if (MARKETPLACE_E2E_REQUIRED) {
    throw new Error(DATASET_SETUP);
  }

  test.skip(true, DATASET_SETUP);
}

let merchandisingDatasetVerified = false;
let adaptiveStorefrontSeeded = false;

function devApiOrigin(): string {
  const raw =
    process.env.SPREE_API_URL ||
    process.env.NEXT_PUBLIC_SPREE_API_URL ||
    "http://localhost:3000/api/v3";
  return raw.replace(/\/$/, "").replace(/\/store$/, "");
}

/** Seeds adaptive storefront fixtures (dynamic home + buyers C/D). Development API only. */
export async function ensureAdaptiveStorefrontDataset(page: Page) {
  await ensureMerchandisingDataset(page);
  if (adaptiveStorefrontSeeded) return;

  const publishableKey = process.env.SPREE_PUBLISHABLE_KEY;
  const response = await page.request.post(
    `${devApiOrigin()}/dev/adaptive_storefront_e2e/seed`,
    {
      headers: publishableKey
        ? { "X-Spree-API-Key": publishableKey }
        : undefined,
      failOnStatusCode: false,
    },
  );

  if (!response.ok()) {
    if (MARKETPLACE_E2E_REQUIRED) {
      throw new Error(
        `Adaptive storefront seed failed (${response.status()}). POST /api/v3/dev/adaptive_storefront_e2e/seed`,
      );
    }
    test.skip(
      true,
      "Adaptive storefront seed unavailable. Run Rails dev server with development routes.",
    );
  }

  adaptiveStorefrontSeeded = true;
}

/** Ensures merchandising signal collection fixtures exist before merchandising E2E. */
export async function ensureMerchandisingDataset(page: Page) {
  if (merchandisingDatasetVerified) {
    return;
  }

  const response = await storefrontGoto(page, MERCH_COLLECTION_PATH);
  const missing = !response || response.status() === 404;

  if (!missing) {
    const card = page.locator(
      `[data-merchandising-product="${MERCH_SKUS.lowStock}"]`,
    );
    const present = await card
      .first()
      .waitFor({ state: "attached", timeout: 45_000 })
      .then(() => true)
      .catch(() => false);
    if (present) {
      merchandisingDatasetVerified = true;
      return;
    }
  }

  if (MARKETPLACE_E2E_REQUIRED) {
    throw new Error(MERCH_SETUP);
  }

  test.skip(true, MERCH_SETUP);
}

/** Keeps dev-merch-new eligible for the PDP "new" badge (views can accumulate during long suites). */
export async function refreshMerchandisingNewListingPdpSignal() {
  if (process.env.MARKETPLACE_E2E_REQUIRED !== "1") return;
  if (requireLabStoreApiUrl() !== "http://127.0.0.1:3021") return;

  const { spawnSync } = await import("node:child_process");
  const ruby = [
    "store = Spree::Store.order(:created_at).first",
    "product = store.products.find_by!(slug: 'dev-merch-new')",
    "Spree::ShopListingView.where(store: store, product: product).delete_all",
    "published_at = 2.days.ago",
    "product.update!(available_on: published_at)",
    "product.product_publications.each do |row| row.update!(published_at: published_at) end",
    "Spree::MerchandisingSignals::Cache.clear! if defined?(Spree::MerchandisingSignals::Cache)",
  ].join("; ");
  const result = spawnSync(
    "docker",
    ["exec", "spree-unified-marketplace-web", "bin/rails", "runner", ruby],
    { encoding: "utf8", shell: false },
  );
  if (result.status !== 0) {
    throw new Error(
      `refreshMerchandisingNewListingPdpSignal failed: ${result.stderr || result.stdout}`,
    );
  }
}

export function merchandisingCard(page: Page, sku: string) {
  return page.locator(`[data-merchandising-product="${sku}"]`).first();
}

export function homeRail(
  page: Page,
  key: "recommended-for-you" | "similar-to-saved",
) {
  return page.locator(`[data-home-rail="${key}"]`);
}

async function runMerchRails(ruby: string) {
  const { runMerchRailsRunner } = await import(
    "../scripts/e2e/merch-rails-runner.mjs"
  );
  const result = await runMerchRailsRunner(ruby);
  if (result.status !== 0) {
    throw new Error(`Merchandising rails runner failed: ${ruby}`);
  }
}

/** Enables Top Shop badges on the merchandising E2E backend (idempotent). */
export async function enableMerchandisingTopShop() {
  if (process.env.MARKETPLACE_E2E_REQUIRED !== "1") {
    return false;
  }

  await runMerchRails(
    "Spree::MarketplaceDevDataset::MerchandisingSignalsFixtures.new(store: Spree::Store.default).enable_top_shop!",
  );
  return true;
}

/** Restores the default merchandising fixture preference (Top Shop off). */
export async function disableMerchandisingTopShop() {
  if (process.env.MARKETPLACE_E2E_REQUIRED !== "1") {
    return false;
  }

  await runMerchRails(
    "Spree::Store.default.update!(preferred_merchandising_top_shop_enabled: false)",
  );
  return true;
}

/** Ensures dev-seller-01 storefront exists before seller-shop E2E. */
export async function ensureSellerStorefrontDataset(page: Page) {
  if (sellerStorefrontDatasetVerified) {
    return;
  }
  const response = await storefrontGoto(page, SELLER_A_SHOP_PATH);
  const missing = !response || response.status() === 404;

  if (!missing) {
    const heading = page.getByRole("heading", { level: 1 });
    const headingText = await heading
      .first()
      .waitFor({ state: "visible", timeout: 45_000 })
      .then(async () => heading.first().textContent())
      .catch(() => "");
    const documentTitle = await page.title().catch(() => "");
    if (
      (headingText && /dev seller/i.test(headingText)) ||
      /dev seller/i.test(documentTitle)
    ) {
      sellerStorefrontDatasetVerified = true;
      return;
    }
  }

  if (MARKETPLACE_E2E_REQUIRED) {
    throw new Error(SELLER_STOREFRONT_SETUP);
  }

  test.skip(true, SELLER_STOREFRONT_SETUP);
}
