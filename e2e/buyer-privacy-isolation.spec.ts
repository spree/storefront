import { loginBuyerThroughAccountForm } from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  MERCH_BUYER_A_EMAIL,
  MERCH_BUYER_B_EMAIL,
  MERCH_BUYER_PASSWORD,
  openPrivacySettings,
  reloadPrivacySettings,
  requireLabStoreApiUrl,
  savePrivacySettings,
} from "./marketplace-fixtures";
import { storeApiFetch } from "./store-api";

test("advertising consent persists independently and stays isolated between buyers", async ({
  page,
  browser,
}, testInfo) => {
  requireLabStoreApiUrl();
  await loginBuyerThroughAccountForm(
    page,
    MERCH_BUYER_A_EMAIL,
    MERCH_BUYER_PASSWORD,
  );
  const originalA = await (
    await storeApiFetch(page, "GET", "customers/me")
  ).json();
  expect(originalA.email).toBe(MERCH_BUYER_A_EMAIL);
  const otherContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  const otherPage = await otherContext.newPage();
  try {
    await loginBuyerThroughAccountForm(
      otherPage,
      MERCH_BUYER_B_EMAIL,
      MERCH_BUYER_PASSWORD,
    );
    const originalB = await (
      await storeApiFetch(otherPage, "GET", "customers/me")
    ).json();
    expect(originalB.email).toBe(MERCH_BUYER_B_EMAIL);
    let { advertising, recommendations } = await openPrivacySettings(page);
    await recommendations.setChecked(true);
    await expect(recommendations).toBeChecked();
    const toggledAdvertisingTarget = !originalA.behavioral_advertising_enabled;
    await advertising.setChecked(toggledAdvertisingTarget);
    await expect(advertising).toBeChecked({
      checked: toggledAdvertisingTarget,
    });
    await savePrivacySettings(page, {
      personalization_enabled: true,
      behavioral_advertising_enabled: toggledAdvertisingTarget,
    });
    ({ advertising, recommendations } = await reloadPrivacySettings(page, {
      personalization_enabled: true,
      behavioral_advertising_enabled: toggledAdvertisingTarget,
    }));
    await expect(advertising).toBeChecked({
      checked: toggledAdvertisingTarget,
    });
    await expect(recommendations).toBeChecked();
    const otherPrivacy = await openPrivacySettings(otherPage);
    await expect(otherPrivacy.advertising).toBeChecked({
      checked: originalB.behavioral_advertising_enabled,
    });
    const afterB = await (
      await storeApiFetch(otherPage, "GET", "customers/me")
    ).json();
    expect(afterB.personalization_enabled).toBe(
      originalB.personalization_enabled,
    );
    expect(afterB.behavioral_advertising_enabled).toBe(
      originalB.behavioral_advertising_enabled,
    );
    await page.screenshot({
      path: testInfo.outputPath("advertising-consent.png"),
      fullPage: true,
    });
  } finally {
    const restored = await storeApiFetch(page, "PATCH", "customers/me", {
      personalization_enabled: originalA.personalization_enabled,
      behavioral_advertising_enabled: originalA.behavioral_advertising_enabled,
    });
    expect(restored.ok).toBe(true);
    await otherContext.close();
  }
});
