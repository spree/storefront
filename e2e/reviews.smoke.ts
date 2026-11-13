import {
  expectBuyerAccountShell,
  loginBuyerViaApi,
  syncBuyerSessionFromCookies,
} from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  SELLER_A_PRODUCT_PATH,
  storefrontGoto,
} from "./marketplace-fixtures";

/**
 * Product reviews smoke — requires marketplace dev dataset on the Spree backend.
 *
 * Seed: `bin/rails spree:marketplace:seed_dev_dataset`
 * Buyer: `dev-buyer-001@example.com` / `spree123`
 *
 * Skipped in default CI (checkout.spec only); run locally after e2e:up + dataset seed.
 */
test.describe("product reviews", () => {
  test.skip(
    !process.env.SPREE_REVIEW_E2E,
    "Set SPREE_REVIEW_E2E=1 with marketplace dev dataset seeded",
  );

  test("buyer sees account reviews nav and product review section", async ({
    page,
  }) => {
    await loginBuyerViaApi(
      page,
      MARKETPLACE_BUYER_EMAIL,
      MARKETPLACE_BUYER_PASSWORD,
    );
    await syncBuyerSessionFromCookies(page);
    await storefrontGoto(page, "/us/en/account", { waitUntil: "load" });
    await expectBuyerAccountShell(page);

    await expect(
      page
        .getByRole("navigation", { name: /^account$/i })
        .getByRole("link", { name: /^reviews$/i }),
    ).toBeVisible({
      timeout: 45_000,
    });

    await storefrontGoto(page, "/us/en/account/reviews", { waitUntil: "load" });
    await expect(
      page.locator("[data-theme-account-page-header]").getByRole("heading", {
        name: /^reviews$/i,
      }),
    ).toBeVisible({ timeout: 30_000 });

    await storefrontGoto(page, SELLER_A_PRODUCT_PATH, { waitUntil: "load" });
    const reviews = page.locator("#reviews");
    await expect(reviews).toBeAttached({ timeout: 60_000 });
    await reviews.scrollIntoViewIfNeeded();
    await expect(reviews).toBeVisible({ timeout: 60_000 });
  });
});
