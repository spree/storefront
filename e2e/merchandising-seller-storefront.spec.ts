/**
 * Seller storefront personalized default ordering, explicit sorts, and attribution.
 */

import { loginBuyerViaApi, logoutBuyer } from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  ensureMerchandisingDataset,
  MERCH_BUYER_A_EMAIL,
  MERCH_BUYER_B_EMAIL,
  MERCH_BUYER_PASSWORD,
  MERCH_SELLER_A_SHOP_PRODUCTS_PATH,
  MERCH_SKUS,
  merchandisingCard,
  storefrontGoto,
} from "./marketplace-fixtures";
import { completeRequiredPersonalization } from "./pdp-helpers";
import {
  assertSellerShopAttribution,
  ensureEmptyStorefrontDtcCart,
  fetchStoreCart,
  findLineByProductSku,
  listIdFromPdpUrl,
  positionFromPdpUrl,
  sellerIdFromPdpUrl,
} from "./store-cart";

async function firstProductSku(page: import("@playwright/test").Page) {
  const card = page.locator("#shop-items [data-merchandising-product]").first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  return card.getAttribute("data-merchandising-product");
}

async function addToCartFromPdp(page: import("@playwright/test").Page) {
  await completeRequiredPersonalization(page);
  // Classic PDP can render a sticky duplicate; prefer the first visible CTA.
  const addToCart = page
    .getByRole("button", { name: /add to cart|adding/i })
    .filter({ visible: true })
    .first();
  await expect(addToCart).toBeVisible({ timeout: 15_000 });
  await expect(addToCart).toBeEnabled({ timeout: 15_000 });
  await addToCart.click();
  // Assert cart feedback rather than the CTA re-enabling — a sticky twin can
  // stay disabled while the drawer already shows the added line.
  await expect(page.getByRole("dialog", { name: /cart/i })).toBeVisible({
    timeout: 60_000,
  });
}

test.describe("seller storefront merchandising", () => {
  const productsPath = MERCH_SELLER_A_SHOP_PRODUCTS_PATH;

  test.beforeEach(async ({ page }) => {
    await ensureMerchandisingDataset(page);
  });

  test("product links carry seller_shop attribution", async ({ page }) => {
    await storefrontGoto(page, productsPath);
    await page.locator("#shop-items").scrollIntoViewIfNeeded();
    const card = merchandisingCard(page, MERCH_SKUS.sellerShopAffinity);
    await expect(card).toBeVisible({ timeout: 30_000 });
    const link = card.locator('a[href*="src=seller_shop"]').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toContain("src=seller_shop");
    expect(href).toContain("seller_id=");
    expect(href).toContain("list_id=");
    expect(href).toContain("pos=");
  });

  test("buyer A sees affinity product first; buyer B sees baseline first", async ({
    page,
  }) => {
    await loginBuyerViaApi(page, MERCH_BUYER_A_EMAIL, MERCH_BUYER_PASSWORD);
    await storefrontGoto(page, productsPath);
    await expect
      .poll(
        async () => {
          await page.locator("#shop-items").scrollIntoViewIfNeeded();
          const sku = await firstProductSku(page).catch(() => null);
          return sku;
        },
        { timeout: 60_000 },
      )
      .toBe(MERCH_SKUS.sellerShopAffinity);

    await logoutBuyer(page);
    await loginBuyerViaApi(page, MERCH_BUYER_B_EMAIL, MERCH_BUYER_PASSWORD);
    await storefrontGoto(page, productsPath);
    await expect
      .poll(
        async () => {
          await page.locator("#shop-items").scrollIntoViewIfNeeded();
          return await firstProductSku(page).catch(() => null);
        },
        { timeout: 60_000 },
      )
      .toBe(MERCH_SKUS.sellerShopBaseline);
  });

  test("explicit sorts override personalized default ordering", async ({
    page,
  }) => {
    await loginBuyerViaApi(page, MERCH_BUYER_A_EMAIL, MERCH_BUYER_PASSWORD);
    await storefrontGoto(page, `${productsPath}&sort=price_asc`);
    expect(await firstProductSku(page)).toBe(MERCH_SKUS.sellerShopAffinity);

    await storefrontGoto(page, `${productsPath}&sort=price_desc`);
    expect(await firstProductSku(page)).toBe(MERCH_SKUS.sellerShopBaseline);

    await storefrontGoto(page, `${productsPath}&sort=available_on_desc`);
    expect(await firstProductSku(page)).toBe(MERCH_SKUS.sellerShopAffinity);

    await storefrontGoto(page, `${productsPath}&sort=best_selling`);
    const bestSellingFirst = await firstProductSku(page);
    expect(bestSellingFirst).toBeTruthy();
  });

  test("seller shop click-through preserves seller_shop cart attribution by SKU", async ({
    page,
  }) => {
    await loginBuyerViaApi(page, MERCH_BUYER_A_EMAIL, MERCH_BUYER_PASSWORD);
    await ensureEmptyStorefrontDtcCart(page, MERCH_BUYER_A_EMAIL);
    await storefrontGoto(page, productsPath);

    const card = merchandisingCard(page, MERCH_SKUS.sellerShopAffinity);
    const link = card.locator('a[href*="src=seller_shop"]').first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    const href = await link.getAttribute("href");
    expect(href).toMatch(/\/products\//);
    const listId = listIdFromPdpUrl(href ?? "");
    const position = positionFromPdpUrl(href ?? "");
    const sellerId = sellerIdFromPdpUrl(href ?? "");

    const productPath = href!.startsWith("http")
      ? new URL(href!).pathname + new URL(href!).search
      : href!;
    await storefrontGoto(page, productPath, { waitUntil: "load" });
    await expect(page).toHaveURL(/\/products\//, { timeout: 30_000 });
    await addToCartFromPdp(page);

    const cart = await fetchStoreCart(page);
    const line = findLineByProductSku(cart, MERCH_SKUS.sellerShopAffinity);
    expect(line).toBeTruthy();
    assertSellerShopAttribution(line!, {
      listId,
      sellerIdFromUrl: sellerId,
    });
    expect(line!.discovery_attribution?.position).toBe(position);
  });
});
