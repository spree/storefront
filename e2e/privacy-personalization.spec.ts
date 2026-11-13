/**
 * Account Settings privacy toggle for personalized recommendations.
 *
 * Run with:
 *   pnpm run e2e:merch:up
 *   pnpm run test:e2e:merch e2e/privacy-personalization.spec.ts
 */

import { loginBuyerViaApi, syncBuyerSessionFromCookies } from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  ensureMerchandisingDataset,
  MERCH_BUYER_A_EMAIL,
  MERCH_BUYER_B_EMAIL,
  MERCH_BUYER_PASSWORD,
  MERCH_CATEGORY_SEARCH_QUERY,
  MERCH_COLLECTION_PATH,
  MERCH_HOME_PATH,
  MERCH_SKUS,
  merchandisingCard,
  openPrivacySettings,
  requireLabStoreApiUrl,
  savePrivacySettings,
  storefrontGoto,
} from "./marketplace-fixtures";
import { storeApiFetch } from "./store-api";

function _cardReason(card: ReturnType<typeof merchandisingCard>, key: string) {
  return card.locator(`[data-merchandising-reason="${key}"]`);
}

test.describe("account privacy personalization", () => {
  let original:
    | {
        email: string;
        personalization_enabled: boolean;
        behavioral_advertising_enabled: boolean;
      }
    | undefined;
  test.beforeEach(() => {
    original = undefined;
  });
  test.afterEach(async ({ page }) => {
    if (!original) return;
    requireLabStoreApiUrl();
    const current = await (
      await storeApiFetch(page, "GET", "customers/me")
    ).json();
    expect(current.email).toBe(original.email);
    const response = await storeApiFetch(page, "PATCH", "customers/me", {
      personalization_enabled: original.personalization_enabled,
      behavioral_advertising_enabled: original.behavioral_advertising_enabled,
    });
    expect(response.ok).toBe(true);
  });
  test("privacy toggle disables homepage personalized rails", async ({
    page,
  }, testInfo) => {
    await loginBuyerViaApi(page, MERCH_BUYER_A_EMAIL, MERCH_BUYER_PASSWORD, {
      requireAccountShell: true,
    });
    original = await (await storeApiFetch(page, "GET", "customers/me")).json();
    expect(original?.email).toBe(MERCH_BUYER_A_EMAIL);
    await ensureMerchandisingDataset(page);
    await storefrontGoto(page, MERCH_HOME_PATH);
    const recommendedRail = page.locator(
      '[data-home-rail="recommended-for-you"]',
    );
    await expect(recommendedRail.first()).toBeVisible({ timeout: 60_000 });
    const configuredRecommendedRails = await recommendedRail.count();
    expect(configuredRecommendedRails).toBeGreaterThan(0);
    await testInfo.attach("published-home-rail-configuration", {
      body: JSON.stringify({ configuredRecommendedRails }),
      contentType: "application/json",
    });
    await storefrontGoto(
      page,
      `/us/en/products?q=${MERCH_CATEGORY_SEARCH_QUERY}`,
    );
    const boostCard = merchandisingCard(page, MERCH_SKUS.categoryBoost);
    const controlCard = merchandisingCard(page, MERCH_SKUS.categoryControl);
    await expect(boostCard).toBeVisible();
    await expect(controlCard).toBeVisible();
    const boostIndexBefore = await boostCard.evaluate((node) => {
      const cards = Array.from(
        document.querySelectorAll("[data-merchandising-product]"),
      );
      return cards.indexOf(node);
    });
    const controlIndexBefore = await controlCard.evaluate((node) => {
      const cards = Array.from(
        document.querySelectorAll("[data-merchandising-product]"),
      );
      return cards.indexOf(node);
    });
    expect(boostIndexBefore).toBeLessThan(controlIndexBefore);

    await storefrontGoto(page, "/us/en/account/settings/privacy");
    const toggle = page.locator("#personalized-recommendations");
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await toggle.setChecked(false);
    await savePrivacySettings(page, { personalization_enabled: false });

    await storefrontGoto(page, MERCH_HOME_PATH);
    await expect(
      page.locator('[data-home-rail="recommended-for-you"]'),
    ).toHaveCount(0, { timeout: 30_000 });
    await expect(
      page.locator('[data-home-rail="similar-to-saved"]'),
    ).toHaveCount(0, { timeout: 30_000 });

    await storefrontGoto(
      page,
      `/us/en/products?q=${MERCH_CATEGORY_SEARCH_QUERY}`,
    );
    const boostOff = merchandisingCard(page, MERCH_SKUS.categoryBoost);
    const controlOff = merchandisingCard(page, MERCH_SKUS.categoryControl);
    await expect(boostOff).toBeVisible();
    await expect(controlOff).toBeVisible();
    const boostIndexOff = await boostOff.evaluate((node) => {
      const cards = Array.from(
        document.querySelectorAll("[data-merchandising-product]"),
      );
      return cards.indexOf(node);
    });
    const controlIndexOff = await controlOff.evaluate((node) => {
      const cards = Array.from(
        document.querySelectorAll("[data-merchandising-product]"),
      );
      return cards.indexOf(node);
    });
    expect(boostIndexOff).toBeGreaterThanOrEqual(controlIndexOff);

    await storefrontGoto(page, MERCH_COLLECTION_PATH);
    const listingAfterOptOut = page.locator("[data-theme-listing-layout]");
    await expect(
      listingAfterOptOut
        .locator(`[data-merchandising-product="${MERCH_SKUS.followed}"]`)
        .locator(
          '[data-merchandising-reason="followed_shop"], [data-merchandising-reason="new_from_followed_shop"]',
        ),
    ).toHaveCount(0);
    await expect(
      merchandisingCard(page, MERCH_SKUS.priority).locator(
        '[data-merchandising-signal="sale"]',
      ),
    ).toBeVisible();

    await syncBuyerSessionFromCookies(page);
    await storefrontGoto(page, "/us/en/account/settings/privacy");
    const personalizationToggle = page.locator("#personalized-recommendations");
    await expect(personalizationToggle).toBeVisible({ timeout: 30_000 });
    await expect(personalizationToggle).not.toBeChecked();

    await personalizationToggle.setChecked(true);
    await savePrivacySettings(page, { personalization_enabled: true });

    await page.reload();
    await expect(personalizationToggle).toBeChecked();

    await storefrontGoto(page, MERCH_HOME_PATH);
    await expect(
      page.locator('[data-home-rail="recommended-for-you"]'),
    ).toHaveCount(configuredRecommendedRails);
    await storefrontGoto(page, MERCH_COLLECTION_PATH);
    const listingAfterRestore = page.locator("[data-theme-listing-layout]");
    await expect(
      listingAfterRestore
        .locator(`[data-merchandising-product="${MERCH_SKUS.followed}"]`)
        .locator(
          '[data-merchandising-reason="followed_shop"], [data-merchandising-reason="new_from_followed_shop"]',
        ),
    ).toBeVisible();
    await storefrontGoto(
      page,
      `/us/en/products?q=${MERCH_CATEGORY_SEARCH_QUERY}`,
    );
    const boostRestored = merchandisingCard(page, MERCH_SKUS.categoryBoost);
    const controlRestored = merchandisingCard(page, MERCH_SKUS.categoryControl);
    const boostIndexRestored = await boostRestored.evaluate((node) => {
      const cards = Array.from(
        document.querySelectorAll("[data-merchandising-product]"),
      );
      return cards.indexOf(node);
    });
    const controlIndexRestored = await controlRestored.evaluate((node) => {
      const cards = Array.from(
        document.querySelectorAll("[data-merchandising-product]"),
      );
      return cards.indexOf(node);
    });
    expect(boostIndexRestored).toBeLessThan(controlIndexRestored);
  });

  test("privacy toggle does not affect a clean-slate buyer", async ({
    page,
  }) => {
    await loginBuyerViaApi(page, MERCH_BUYER_B_EMAIL, MERCH_BUYER_PASSWORD, {
      requireAccountShell: true,
    });
    original = await (await storeApiFetch(page, "GET", "customers/me")).json();
    expect(original?.email).toBe(MERCH_BUYER_B_EMAIL);
    await ensureMerchandisingDataset(page);
    const { recommendations } = await openPrivacySettings(page);
    await recommendations.setChecked(false);
    await savePrivacySettings(page);
    await storefrontGoto(page, MERCH_HOME_PATH);
    await expect(
      page.locator('[data-home-rail="recommended-for-you"]'),
    ).toHaveCount(0);
  });
});
