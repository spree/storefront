import { expect, test } from "@playwright/test";
import { loginBuyerViaApi } from "./buyer-auth";
import {
  ensureMarketplaceDataset,
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  MARKETPLACE_PRODUCT_A,
  MARKETPLACE_PRODUCT_B,
  SELLER_A_PRODUCT_SLUG,
  SELLER_B_PRODUCT_SLUG,
} from "./marketplace-fixtures";
import { addProductToCart } from "./pdp-helpers";
import {
  assertBuyerCart,
  assertCartContainsProductSlug,
  ensureEmptyStorefrontDtcCart,
  fetchStoreCart,
} from "./store-cart";

/**
 * Multi-seller checkout smoke against the marketplace dev dataset.
 *
 * Prerequisites:
 *   From the Rails app root (this worktree's `server/`):
 *     bin/rails spree:marketplace:seed_dev_dataset
 *     bin/rails spree:marketplace:validate_dataset
 *   Store API + storefront running (`reuseExistingServer` in playwright.config).
 *
 * Set MARKETPLACE_E2E_REQUIRED=1 to fail instead of skip when seed data is missing.
 *
 * Completes with the seeded Check payment method when Stripe is absent.
 */

const BUYER_EMAIL = MARKETPLACE_BUYER_EMAIL;
const BUYER_PASSWORD = MARKETPLACE_BUYER_PASSWORD;
const PRODUCT_A = MARKETPLACE_PRODUCT_A;
const PRODUCT_B = MARKETPLACE_PRODUCT_B;

async function signIn(page: import("@playwright/test").Page) {
  await loginBuyerViaApi(page, BUYER_EMAIL, BUYER_PASSWORD, {
    requireAccountShell: true,
  });
}

test.describe("multi-seller checkout", () => {
  test("two seller cart completes as OrderGroup with dual shipping", async ({
    page,
  }) => {
    test.setTimeout(600_000);

    await ensureMarketplaceDataset(page);
    await signIn(page);
    await ensureEmptyStorefrontDtcCart(page, BUYER_EMAIL);
    await addProductToCart(page, PRODUCT_A);
    const cartId = (await fetchStoreCart(page)).id;
    assertCartContainsProductSlug(
      await assertBuyerCart(page, BUYER_EMAIL, cartId, 1),
      SELLER_A_PRODUCT_SLUG,
    );
    await addProductToCart(page, PRODUCT_B);
    const twoLineCart = await assertBuyerCart(page, BUYER_EMAIL, cartId, 2);
    assertCartContainsProductSlug(twoLineCart, SELLER_A_PRODUCT_SLUG);
    assertCartContainsProductSlug(twoLineCart, SELLER_B_PRODUCT_SLUG);

    await page.goto("/us/en/cart");
    await expect(
      page.getByText(/dev seller 01 storefront sku/i).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText(/dev seller 02 storefront sku/i).first(),
    ).toBeVisible({ timeout: 60_000 });

    const checkout = page
      .getByRole("link", { name: /proceed to checkout/i })
      .first();
    await expect(checkout).toBeVisible({ timeout: 15_000 });
    const href = await checkout.getAttribute("href");
    expect(href).toMatch(/\/checkout\/cart_/);
    await page.goto(href!);

    await expect(
      page.getByRole("heading", { name: /shipping address/i }),
    ).toBeVisible({ timeout: 30_000 });

    const addressField = page.getByPlaceholder(/^address$/i);
    if (await addressField.count()) {
      await page.getByPlaceholder(/^first name$/i).fill("Dev");
      await page.getByPlaceholder(/^last name$/i).fill("Buyer");
      await addressField.fill("123 Market St");
      await page.getByPlaceholder(/^city$/i).fill("San Francisco");
      await page.getByLabel(/state/i).selectOption({ label: "California" });
      await page.getByPlaceholder(/zip|postal/i).fill("94105");
      await page.getByRole("radio").first().focus();
    } else {
      await expect(
        page.getByRole("radio", { name: /123 Market St, San Francisco/i }),
      ).toBeChecked();
    }
    await expect
      .poll(
        async () => {
          const cart = await fetchStoreCart(page);
          return cart.id === cartId && Boolean(cart.shipping_address?.address1);
        },
        { timeout: 30_000 },
      )
      .toBe(true);

    await expect(page.getByText(/shipping address is required/i)).toHaveCount(
      0,
      { timeout: 30_000 },
    );

    await expect(
      page.getByText(
        /enter your shipping address to view available shipping methods/i,
      ),
    ).toHaveCount(0, { timeout: 45_000 });

    const shippingRates = page.getByRole("radio");
    await expect(shippingRates.first()).toBeVisible({ timeout: 45_000 });
    await expect(shippingRates.first()).toBeChecked({ timeout: 45_000 });

    const expressGate = page.getByText(/not available|multiple|express/i);
    if (await expressGate.count()) {
      await expect(expressGate.first()).toBeVisible();
    }

    const placeOrder = page.getByRole("button", {
      name: /place order|pay now/i,
    });
    await expect(placeOrder).toBeEnabled({ timeout: 60_000 });
    await placeOrder.click();

    await page.waitForURL(/order-placed/, { timeout: 90_000 });
    await expect(page.getByText(/thanks for your order/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/R\d+/).first()).toBeVisible();
    await expect(
      page.getByText(/Dev Seller 01 Storefront SKU/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Dev Seller 02 Storefront SKU/i).first(),
    ).toBeVisible();
    const sellerOrderHeadings = page.getByRole("heading", {
      name: /seller order/i,
    });
    await expect(sellerOrderHeadings).toHaveCount(2);
    const orderLinks = page.getByRole("link", { name: /view order/i });
    await expect(orderLinks).toHaveCount(2);
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await expect(
      page.getByText(/Dev Seller 01 Storefront SKU/i).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/Dev Seller 02 Storefront SKU/i).first(),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /view order/i })
      .first()
      .click();
    await expect(page.getByText(/order #|R\d+/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
