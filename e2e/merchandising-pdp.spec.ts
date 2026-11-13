/**
 * PDP merchandising zone matrix.
 */

import { loginBuyerViaApi, syncBuyerSessionFromCookies } from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  ensureMerchandisingDataset,
  MERCH_BUYER_A_EMAIL,
  MERCH_BUYER_PASSWORD,
  MERCH_SKUS,
  refreshMerchandisingNewListingPdpSignal,
  storefrontGoto,
} from "./marketplace-fixtures";

async function expectMerchandisingVisible(
  page: import("@playwright/test").Page,
  selector: string,
) {
  const target = page.locator(selector).filter({ visible: true }).first();
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible({ timeout: 30_000 });
}

async function gotoMerchProduct(
  page: import("@playwright/test").Page,
  sku: string,
) {
  await syncBuyerSessionFromCookies(page).catch(async () => {
    await loginBuyerViaApi(page, MERCH_BUYER_A_EMAIL, MERCH_BUYER_PASSWORD);
  });
  await storefrontGoto(page, `/us/en/products/${sku}`);
}

test.describe("PDP merchandising zones", () => {
  test.beforeEach(async ({ page }) => {
    await loginBuyerViaApi(page, MERCH_BUYER_A_EMAIL, MERCH_BUYER_PASSWORD);
    await ensureMerchandisingDataset(page);
    await refreshMerchandisingNewListingPdpSignal();
  });

  test("commerce and soft zones render without duplicates", async ({
    page,
  }) => {
    test.setTimeout(420_000);
    await gotoMerchProduct(page, MERCH_SKUS.priority);
    await expect(page.getByText(/50% off.*limited time sale/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('[data-merchandising-pdp-signal="low_stock"]').first(),
    ).toHaveCount(0);

    await gotoMerchProduct(page, MERCH_SKUS.followed);
    await expectMerchandisingVisible(
      page,
      '[data-merchandising-reason="followed_shop"]',
    );

    await gotoMerchProduct(page, MERCH_SKUS.newFromFollowed);
    await expectMerchandisingVisible(
      page,
      '[data-merchandising-reason="new_from_followed_shop"]',
    );

    await gotoMerchProduct(page, MERCH_SKUS.restock);
    await expectMerchandisingVisible(
      page,
      '[data-merchandising-pdp-signal="back_in_stock_for_you"]',
    );

    await gotoMerchProduct(page, MERCH_SKUS.priceDrop);
    await expectMerchandisingVisible(
      page,
      '[data-merchandising-pdp-signal="price_drop_for_you"]',
    );

    await gotoMerchProduct(page, MERCH_SKUS.bestseller);
    await expectMerchandisingVisible(
      page,
      '[data-merchandising-pdp-signal="bestseller"]',
    );

    await gotoMerchProduct(page, MERCH_SKUS.new);
    await expectMerchandisingVisible(
      page,
      '[data-merchandising-pdp-signal="new"]',
    );
  });
});
