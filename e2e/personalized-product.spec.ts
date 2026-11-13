/**
 * Personalized product purchase path.
 *
 * Requires MarketplaceDevDataset personalizations (Seller A engraved product).
 * Skips when the seeded product is not present — Windows/local native tooling
 * often cannot rebuild the dataset; CI/Linux should run this green.
 *
 * Run with: pnpm run e2e:up && pnpm run test:e2e e2e/personalized-product.spec.ts
 */

import { loginBuyerViaApi, syncBuyerSessionFromCookies } from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  MARKETPLACE_PRODUCT_A,
  storefrontGoto,
} from "./marketplace-fixtures";
import { ensureEmptyStorefrontDtcCart } from "./store-cart";

async function configureEngraving(
  page: import("@playwright/test").Page,
  name: string,
) {
  const personalizeToggle = page.getByRole("button", {
    name: /add personalization/i,
  });
  if (await personalizeToggle.isVisible().catch(() => false)) {
    await personalizeToggle.click();
  }
  await expect(
    page.getByText(/personalize this item|add engraving|font/i).first(),
  ).toBeVisible({
    timeout: 30_000,
  });

  const enableEngraving = page.getByRole("checkbox", {
    name: /add engraving/i,
  });
  await expect(enableEngraving).toBeVisible({ timeout: 15_000 });
  if (!(await enableEngraving.isChecked())) {
    await enableEngraving.click();
  }
  await expect(enableEngraving).toBeChecked({ timeout: 5_000 });

  const engravingName = page.getByLabel(/name to engrave/i);
  await expect(engravingName).toBeVisible({ timeout: 15_000 });
  await engravingName.click();
  await engravingName.fill(name);
  await expect(engravingName).toHaveValue(name);

  const scriptRadio = page.getByRole("radio", { name: /^script$/i });
  if (await scriptRadio.isVisible().catch(() => false)) {
    await scriptRadio.check({ force: true }).catch(async () => {
      await scriptRadio.click();
    });
  } else {
    await page
      .locator("label")
      .filter({ hasText: /^script$/i })
      .click();
  }
}

test.describe("personalized product purchase", () => {
  test("configures personalization, carts snapshot, and keeps Sarah vs Michael separate", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    await loginBuyerViaApi(
      page,
      MARKETPLACE_BUYER_EMAIL,
      MARKETPLACE_BUYER_PASSWORD,
    );
    await syncBuyerSessionFromCookies(page);
    await ensureEmptyStorefrontDtcCart(page, MARKETPLACE_BUYER_EMAIL);
    await syncBuyerSessionFromCookies(page);

    await storefrontGoto(page, MARKETPLACE_PRODUCT_A, { waitUntil: "load" });
    await expect(page).toHaveURL(/\/products\//);
    await configureEngraving(page, "Sarah");

    const addToCart = page
      .getByRole("button", { name: /add to cart/i })
      .first();
    await addToCart.click();
    // Server action — assert cart UI, not Spree network from the browser.
    await expect(
      page
        .getByRole("link", { name: /view cart/i })
        .or(page.getByRole("heading", { name: /your cart/i })),
    ).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByText(/fix the highlighted|is required|failed to add/i),
    ).toHaveCount(0);
    await expect(page.getByText(/sarah/i).first()).toBeVisible({
      timeout: 30_000,
    });
    const viewCart = page.getByRole("link", { name: /view cart/i });
    if (await viewCart.isVisible().catch(() => false)) {
      await viewCart.click();
    } else {
      await storefrontGoto(page, "/us/en/cart", { waitUntil: "load" });
    }
    await expect(page.getByText(/sarah/i).first()).toBeVisible({
      timeout: 30_000,
    });

    await storefrontGoto(page, MARKETPLACE_PRODUCT_A, { waitUntil: "load" });
    await syncBuyerSessionFromCookies(page);
    await configureEngraving(page, "Michael");
    await page
      .getByRole("button", { name: /add to cart/i })
      .first()
      .click();
    await expect(page.getByText(/michael/i).first()).toBeVisible({
      timeout: 45_000,
    });
    if (await viewCart.isVisible().catch(() => false)) {
      await viewCart.click();
    } else {
      await storefrontGoto(page, "/us/en/cart", { waitUntil: "load" });
    }
    await expect(page.getByText(/sarah/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/michael/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
