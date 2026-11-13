import { expect, test } from "@playwright/test";
import { loginBuyerThroughAccountForm } from "./buyer-auth";
import {
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  prepareStorefrontPage,
  SELLER_A_PRODUCT_PATH,
  storefrontGoto,
} from "./marketplace-fixtures";
import { completeRequiredPersonalization } from "./pdp-helpers";

test.describe("mobile product detail", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("gallery, purchase flow, and sticky add to cart bar", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await prepareStorefrontPage(page);
    await loginBuyerThroughAccountForm(
      page,
      MARKETPLACE_BUYER_EMAIL,
      MARKETPLACE_BUYER_PASSWORD,
    );
    await storefrontGoto(page, SELLER_A_PRODUCT_PATH);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 60_000,
    });

    await expect(
      page.getByRole("navigation", { name: /marketplace navigation/i }),
    ).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath("mobile-pdp-above-fold.png"),
      fullPage: false,
    });

    const primaryAdd = page
      .locator("[data-theme-product-purchase]")
      .getByRole("button", { name: /^add to cart$/i })
      .first();
    await expect(primaryAdd).toBeVisible();
    await completeRequiredPersonalization(page);
    await expect(primaryAdd).toBeEnabled({ timeout: 30_000 });
    await primaryAdd.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });

    await page.evaluate(() => window.scrollBy(0, 1200));
    const sticky = page.locator('[data-product-sticky-purchase="true"]');
    await expect(sticky).toBeVisible({ timeout: 15_000 });
    await expect(
      sticky.getByRole("button", { name: /^add to cart$/i }),
    ).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("mobile-pdp-sticky-bar.png"),
      fullPage: false,
    });
  });
});
