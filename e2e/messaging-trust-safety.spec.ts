/**
 * Messaging trust & safety (buyer storefront).
 *
 *   pnpm run e2e:up
 *   $env:MARKETPLACE_E2E_REQUIRED="1"; pnpm run test:e2e e2e/messaging-trust-safety.spec.ts
 */

import { loginBuyerViaApi, syncBuyerSessionFromCookies } from "./buyer-auth";
import { expect, test } from "./buyer-desktop-evidence";
import {
  ensureMarketplaceDataset,
  ensureSellerStorefrontDataset,
  MARKETPLACE_E2E_REQUIRED,
  MARKETPLACE_PRODUCT_A,
  SELLER_A_SHOP_PATH,
  storefrontGoto,
  TRUST_SAFETY_BUYER_EMAIL,
  TRUST_SAFETY_BUYER_PASSWORD,
} from "./marketplace-fixtures";
import { storeApiFetch } from "./store-api";

async function loginTrustSafetyBuyer(page: import("@playwright/test").Page) {
  await loginBuyerViaApi(
    page,
    TRUST_SAFETY_BUYER_EMAIL,
    TRUST_SAFETY_BUYER_PASSWORD,
    { requireAccountShell: true },
  );
}

async function sellerContactControl(page: import("@playwright/test").Page) {
  return page
    .getByRole("button", { name: /^contact$/i })
    .or(page.getByRole("link", { name: /^contact$/i }))
    .first();
}

/** Opens the classic PDP ask-about control in the buy box (not theme meet-the-maker). */
async function expectProductAskAboutVisible(
  page: import("@playwright/test").Page,
) {
  const askAbout = page.getByRole("button", { name: /ask about this item/i });
  await askAbout.scrollIntoViewIfNeeded();
  await expect(askAbout).toBeVisible({ timeout: 60_000 });
}

async function trustSafetyBlockExists(page: import("@playwright/test").Page) {
  const response = await storeApiFetch(
    page,
    "GET",
    "customers/me/communication_blocks",
  );
  if (!response.ok) return false;
  const payload = await response.json();
  const blocks: Array<{ seller_slug?: string }> = Array.isArray(payload)
    ? payload
    : (payload.data ?? []);
  return blocks.some((row) => row.seller_slug === "dev-seller-01");
}

async function ensureTrustSafetySellerUnblocked(
  page: import("@playwright/test").Page,
) {
  const allowedLabApis = new Set([
    "http://127.0.0.1:3020",
    "http://127.0.0.1:3021",
    "http://127.0.0.1:3031",
  ]);
  if (!allowedLabApis.has(process.env.SPREE_API_URL ?? "")) {
    throw new Error(
      "Communication-block cleanup requires isolated or unified lab API (3020, 3021, or 3031)",
    );
  }
  await loginTrustSafetyBuyer(page);
  const buyerResponse = await storeApiFetch(page, "GET", "customers/me");
  const buyer = await buyerResponse.json();
  if (!buyerResponse.ok || buyer.email !== TRUST_SAFETY_BUYER_EMAIL) {
    throw new Error(
      "Communication-block cleanup requires the dedicated T&S buyer",
    );
  }
  const response = await storeApiFetch(
    page,
    "GET",
    "customers/me/communication_blocks",
  );
  if (!response.ok) return;
  const payload = await response.json();
  const blocks: Array<{ id: string; seller_slug?: string }> = Array.isArray(
    payload,
  )
    ? payload
    : (payload.data ?? []);
  for (const block of blocks.filter(
    (row) => row.seller_slug === "dev-seller-01",
  )) {
    const removed = await storeApiFetch(
      page,
      "DELETE",
      `customers/me/communication_blocks/${block.id}`,
    );
    expect(removed.ok).toBe(true);
  }
}

test.describe
  .serial("Messaging trust & safety", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        window.confirm = () => true;
      });
      await ensureMarketplaceDataset(page);
      await ensureSellerStorefrontDataset(page);
      await ensureTrustSafetySellerUnblocked(page);
    });

    test("T&S buyer can contact Seller A before blocking", async ({ page }) => {
      await loginTrustSafetyBuyer(page);
      await syncBuyerSessionFromCookies(page);
      await storefrontGoto(page, SELLER_A_SHOP_PATH);
      const contact = await sellerContactControl(page);
      await expect(contact).toBeVisible({ timeout: 60_000 });
      await expect(contact).toBeEnabled({ timeout: 15_000 });
      if (MARKETPLACE_E2E_REQUIRED) {
        await expect(
          page.getByText(/messaging is unavailable for this conversation/i),
        ).not.toBeVisible();
      }
    });

    test("full block, storefront, unblock, and report journey", async ({
      page,
    }) => {
      test.setTimeout(420_000);
      await loginTrustSafetyBuyer(page);
      await syncBuyerSessionFromCookies(page);
      await storefrontGoto(page, SELLER_A_SHOP_PATH, { waitUntil: "load" });
      const contactButton = page.getByRole("button", { name: /^contact$/i });
      await expect(contactButton).toBeVisible({ timeout: 60_000 });
      await expect(contactButton).toBeEnabled({ timeout: 15_000 });
      await contactButton.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 45_000 });
      await syncBuyerSessionFromCookies(page);
      const body = `T&S journey ${Date.now()}`;
      await dialog.getByPlaceholder(/write your message/i).fill(body);
      await syncBuyerSessionFromCookies(page);
      const send = dialog.getByRole("button", { name: /^send$/i });
      await expect(send).toBeEnabled({ timeout: 15_000 });
      await send.click();
      await expect
        .poll(
          async () => {
            if (/\/account\/messages\/msgth_/.test(page.url()))
              return "navigated";
            if (
              await page
                .getByText(
                  /could not send your message|failed to send|send failed/i,
                )
                .isVisible()
                .catch(() => false)
            ) {
              return "error";
            }
            if (await send.isVisible().catch(() => false)) {
              await syncBuyerSessionFromCookies(page).catch(() => undefined);
              if (await send.isEnabled().catch(() => false)) {
                await send.click().catch(() => undefined);
              }
            }
            return "pending";
          },
          { timeout: 90_000 },
        )
        .toBe("navigated");
      await expect(
        page.getByText(
          /could not send your message|failed to send|send failed/i,
        ),
      ).not.toBeVisible({
        timeout: 5_000,
      });
      await expect(page.getByText(body)).toBeVisible({ timeout: 15_000 });
      const threadUrl = page.url();
      expect(threadUrl).toMatch(/\/account\/messages\/msgth_/);

      await page.getByRole("button", { name: /conversation actions/i }).click();
      const blockSellerAction = page.getByRole("button", {
        name: /block seller/i,
      });
      await expect(blockSellerAction).toBeVisible({ timeout: 10_000 });
      await blockSellerAction.scrollIntoViewIfNeeded();
      await blockSellerAction.click();
      await expect
        .poll(
          async () => {
            if (await trustSafetyBlockExists(page)) return true;
            await page
              .getByRole("button", { name: /conversation actions/i })
              .click()
              .catch(() => undefined);
            const retryBlock = page.getByRole("button", {
              name: /block seller/i,
            });
            if (await retryBlock.isVisible().catch(() => false)) {
              await retryBlock.click().catch(() => undefined);
            }
            return trustSafetyBlockExists(page);
          },
          { timeout: 60_000 },
        )
        .toBe(true);
      await page.reload({ waitUntil: "load" });
      await expect(
        page.getByText(/messaging is unavailable for this conversation/i),
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByRole("textbox", { name: /write a message/i }),
      ).not.toBeVisible();

      await page.goto(SELLER_A_SHOP_PATH);
      await expect(
        page.getByRole("button", { name: /^contact$/i }),
      ).toBeDisabled();

      await storefrontGoto(page, MARKETPLACE_PRODUCT_A, { waitUntil: "load" });
      await expectProductAskAboutVisible(page);
      await expect(
        page.getByRole("button", { name: /ask about this item/i }),
      ).toBeDisabled({ timeout: 20_000 });
      await expect(
        page.getByRole("button", { name: /add to cart/i }),
      ).toBeEnabled();

      // Return to the same thread for unblock (inbox is covered by earlier nav).
      await syncBuyerSessionFromCookies(page);
      await storefrontGoto(page, threadUrl, { waitUntil: "load" });
      await expect(page).toHaveURL(/\/account\/messages\/msgth_/, {
        timeout: 60_000,
      });
      await page.getByRole("button", { name: /conversation actions/i }).click();
      const unblockSellerAction = page.getByRole("button", {
        name: /unblock seller/i,
      });
      await expect(unblockSellerAction).toBeVisible({ timeout: 10_000 });
      await unblockSellerAction.scrollIntoViewIfNeeded();
      await unblockSellerAction.click();
      await expect
        .poll(() => trustSafetyBlockExists(page).then((exists) => !exists), {
          timeout: 60_000,
        })
        .toBe(true);
      await page.reload({ waitUntil: "load" });
      await expect(
        page.getByRole("textbox", { name: /write a message/i }),
      ).toBeVisible({
        timeout: 60_000,
      });

      await page.getByRole("button", { name: /^report$/i }).click();
      const reportBody = `Trust safety e2e report ${Date.now()}`;
      const reportField = page.getByPlaceholder(/describe what happened/i);
      await expect(reportField).toBeVisible({ timeout: 15_000 });
      await reportField.click();
      await reportField.fill(reportBody);
      const submitReport = page.getByRole("button", { name: /submit report/i });
      await expect
        .poll(
          async () => {
            if (await submitReport.isEnabled().catch(() => false)) return true;
            await reportField.click();
            await reportField.fill("");
            await reportField.pressSequentially(reportBody, { delay: 5 });
            return submitReport.isEnabled().catch(() => false);
          },
          { timeout: 30_000 },
        )
        .toBe(true);
      await submitReport.click();
      await expect(page.getByRole("button", { name: /^report$/i })).toBeVisible(
        { timeout: 30_000 },
      );
    });
  });
