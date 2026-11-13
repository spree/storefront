/**
 * Homepage visual composition smoke (hero, discovery, shops, overflow).
 *
 *   pnpm exec playwright test e2e/homepage-visual.spec.ts --workers=1
 */

import { loginBuyerThroughAccountForm } from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  ensureMarketplaceDataset,
  ensureSellerStorefrontDataset,
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  prepareStorefrontPage,
  SELLER_A_SHOP_PATH,
  storefrontGoto,
} from "./marketplace-fixtures";
import { completeRequiredPersonalization } from "./pdp-helpers";
import { fetchStoreCart } from "./store-cart";

test.describe("homepage visual", () => {
  test.describe.configure({ timeout: 300_000 });

  test.beforeEach(async ({ page }) => {
    await prepareStorefrontPage(page);
    await ensureMarketplaceDataset(page);
    await ensureSellerStorefrontDataset(page);
  });

  test("home discovery, product and shop journeys, mobile overflow", async ({
    page,
  }) => {
    await loginBuyerThroughAccountForm(
      page,
      MARKETPLACE_BUYER_EMAIL,
      MARKETPLACE_BUYER_PASSWORD,
    );

    await storefrontGoto(page, "/us/en");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });

    const discoveryHeading = page.getByRole("heading", {
      name: /jump into featured interests|gifts as special|most-loved categories|gift guides|trending|customer favorites/i,
    });
    await expect(discoveryHeading.first()).toBeVisible({ timeout: 20_000 });

    const productLink = page
      .getByRole("link", { name: /dev seller 01 storefront sku/i })
      .first();
    await expect(productLink).toBeVisible({ timeout: 20_000 });
    const productHref = await productLink.getAttribute("href");
    expect(productHref).toMatch(/dev-dataset-dev-seller-01-storefront-sku/);
    await storefrontGoto(page, productHref!);
    await expect(page).toHaveURL(/\/products\//);

    await storefrontGoto(page, "/us/en");
    const visitShop = page.getByRole("link", { name: /^visit shop$/i }).first();
    if (await visitShop.isVisible().catch(() => false)) {
      const shopHref = await visitShop.getAttribute("href");
      expect(shopHref).toMatch(/\/sellers\//);
      await storefrontGoto(page, shopHref!);
      await expect(page).toHaveURL(/\/sellers\//);
    } else {
      await storefrontGoto(page, SELLER_A_SHOP_PATH);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }

    const categoryCta = page
      .getByRole("link", { name: /shop collection|view all|explore/i })
      .first();
    if (await categoryCta.isVisible().catch(() => false)) {
      const ctaHref = await categoryCta.getAttribute("href");
      if (ctaHref && !ctaHref.startsWith("http")) {
        await storefrontGoto(page, ctaHref);
        await expect(page).not.toHaveURL(/\/us\/en$/);
      }
    }

    await storefrontGoto(page, "/us/en");
    const homeProduct = page
      .getByRole("link", { name: /dev seller 01 storefront sku/i })
      .first();
    await expect(homeProduct).toBeVisible({ timeout: 20_000 });
    const cartJourneyHref = await homeProduct.getAttribute("href");
    expect(cartJourneyHref).toMatch(/storefront-sku/);
    await storefrontGoto(page, cartJourneyHref!);
    await expect(page).toHaveURL(/\/products\//, { timeout: 20_000 });
    await completeRequiredPersonalization(page);
    const addToCart = page
      .getByRole("main")
      .getByRole("button", { name: /add to cart/i });
    await expect(addToCart).toBeEnabled({ timeout: 15_000 });
    await addToCart.click();
    await expect
      .poll(
        async () =>
          (await page.context().cookies()).some(
            (cookie) => cookie.name === "_spree_cart_token_id",
          ),
        {
          message: "the completed add-to-cart action to persist its cart id",
          timeout: 60_000,
        },
      )
      .toBe(true);
    const cartDialog = page.getByRole("dialog", { name: /cart/i });
    if (!(await cartDialog.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: /open cart/i }).click();
    }
    await expect(cartDialog).toBeVisible({
      timeout: 20_000,
    });

    const cart = await fetchStoreCart(page);
    expect(cart.items?.length).toBeGreaterThan(0);
    const line = cart.items?.find((item) =>
      item.name?.toLowerCase().includes("storefront sku"),
    );
    expect(line).toBeTruthy();
    if (line?.discovery_attribution) {
      expect(line.discovery_attribution.product_id).toBeTruthy();
    }

    await page.setViewportSize({ width: 375, height: 812 });
    await storefrontGoto(page, "/us/en");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    expect(overflow).toBe(false);
  });
});
