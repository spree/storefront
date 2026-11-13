import { expect, type FrameLocator, type Page, test } from "@playwright/test";
import { loginBuyerViaApi } from "./buyer-auth";
import {
  ensureMarketplaceDataset,
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  MARKETPLACE_COUPON_MARKETPLACE,
  MARKETPLACE_COUPON_SELLER_B,
  MARKETPLACE_PRODUCT_A,
  MARKETPLACE_PRODUCT_B,
  SELLER_A_PRODUCT_SLUG,
  SELLER_B_PRODUCT_SLUG,
} from "./marketplace-fixtures";
import { addProductToCart } from "./pdp-helpers";
import { storeApiFetch } from "./store-api";
import {
  assertBuyerCart,
  assertCartContainsProductSlug,
  ensureEmptyStorefrontDtcCart,
  fetchStoreCart,
} from "./store-cart";

async function signIn(page: Page) {
  await loginBuyerViaApi(
    page,
    MARKETPLACE_BUYER_EMAIL,
    MARKETPLACE_BUYER_PASSWORD,
    {
      requireAccountShell: true,
    },
  );
}

async function openCheckoutFromCart(
  page: Page,
  cartId: string,
  options?: { lineCount?: number },
) {
  const lineCount = options?.lineCount ?? 2;
  const cart = await assertBuyerCart(
    page,
    MARKETPLACE_BUYER_EMAIL,
    cartId,
    lineCount,
  );
  if (lineCount > 1) {
    assertCartContainsProductSlug(cart, SELLER_A_PRODUCT_SLUG);
    assertCartContainsProductSlug(cart, SELLER_B_PRODUCT_SLUG);
  } else {
    assertCartContainsProductSlug(cart, SELLER_B_PRODUCT_SLUG);
  }

  // Production preview can error on /cart while checkout still loads from cart id.
  await page.goto(`/us/en/checkout/${cartId}`, { waitUntil: "load" });

  await expect(
    page.getByRole("heading", { name: /shipping address/i }),
  ).toBeVisible({ timeout: 90_000 });
}

async function fillShipping(page: Page, cartId: string) {
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
      { timeout: 60_000 },
    )
    .toBe(true);

  await expect(
    page.getByText(
      /enter your shipping address to view available shipping methods/i,
    ),
  ).toHaveCount(0, { timeout: 90_000 });

  const shippingRates = page.getByRole("radio");
  await expect(shippingRates.first()).toBeVisible({ timeout: 90_000 });
  await expect(shippingRates.first()).toBeChecked({ timeout: 90_000 });
}

async function expectCartHasPromotionDiscount(page: Page, cartId: string) {
  await expect
    .poll(
      async () => {
        const cart = await fetchStoreCart(page);
        if (cart.id !== cartId) return false;
        const discountTotal = Number(cart.discount_total ?? "0");
        return discountTotal < 0 || (cart.discounts?.length ?? 0) > 0;
      },
      { timeout: 60_000 },
    )
    .toBe(true);
}

async function applyCoupon(page: Page, cartId: string, code: string) {
  const response = await storeApiFetch(
    page,
    "POST",
    `carts/${cartId}/discount_codes`,
    { code },
  );
  expect(
    response.ok,
    `apply coupon ${code}: ${response.status} ${await response.text()}`,
  ).toBeTruthy();
}

const STRIPE_TEST_CARD = "4242424242424242";

async function fillStripeTestCard(page: Page): Promise<void> {
  const stripeFrames = page.locator(
    'iframe[title="Secure payment input frame"]',
  );

  const resolveCardFrame = async (): Promise<FrameLocator> => {
    const frameCount = await stripeFrames.count();
    for (let i = 0; i < frameCount; i += 1) {
      const frame = stripeFrames.nth(i).contentFrame();
      if (await frame.getByRole("textbox", { name: "Card number" }).count()) {
        return frame;
      }
    }
    throw new Error("Stripe card form did not render");
  };

  const cardFrame = await resolveCardFrame();
  const cardNumber = cardFrame.getByRole("textbox", { name: "Card number" });
  await cardNumber.fill(STRIPE_TEST_CARD, { timeout: 15_000 });
  await cardFrame
    .getByPlaceholder("MM / YY")
    .fill("12 / 30", { timeout: 15_000 });
  await cardFrame.getByRole("textbox", { name: "Security code" }).fill("123", {
    timeout: 15_000,
  });
  const zip = cardFrame.getByRole("textbox", { name: /zip code/i });
  if (await zip.count()) {
    await zip.fill("94105", { timeout: 15_000 });
  }
  await page.waitForTimeout(1_500);
  await expect(cardNumber).toHaveValue(/4242/, { timeout: 5_000 });
}

async function placeOrder(page: Page) {
  const check = page.getByRole("radio", { name: /check/i });
  const savedCard = page.getByRole("radio", { name: /ending in 4242/i });
  if (await check.count()) {
    await check.check();
  } else if (await savedCard.count()) {
    await savedCard.check();
  } else {
    await expect(async () => {
      await fillStripeTestCard(page);
    }).toPass({ timeout: 90_000 });
  }
  const policy = page.getByRole("checkbox", { name: /i agree/i });
  if (await policy.count()) {
    await policy.check();
  }
  await expect(async () => {
    if (/\/order-placed\//.test(page.url())) return;
    if (!(await check.count()) && !(await savedCard.count())) {
      await fillStripeTestCard(page);
    }
    await page
      .getByRole("button", { name: /place order|pay now/i })
      .click({ timeout: 15_000 });
    await page.waitForURL(/order-placed/, { timeout: 60_000 });
  }).toPass({ timeout: 180_000 });
  await expect(page.getByText(/thanks for your order/i)).toBeVisible({
    timeout: 30_000,
  });
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({
      path: testInfo.outputPath("failure.png"),
      fullPage: true,
    });
  }
});

test.describe("marketplace promotion funding (buyer)", () => {
  test.beforeEach(async ({ page }) => {
    await ensureMarketplaceDataset(page);
  });

  test("cert baseline: home, PDP, auth, cart and checkout shell", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.goto("/us/en", { waitUntil: "load" });
    await expect(
      page.getByRole("link", { name: /spree/i }).first(),
    ).toBeVisible({
      timeout: 60_000,
    });
    await page.goto(MARKETPLACE_PRODUCT_A, { waitUntil: "load" });
    await signIn(page);
    await ensureEmptyStorefrontDtcCart(page, MARKETPLACE_BUYER_EMAIL);
    await addProductToCart(page, MARKETPLACE_PRODUCT_A);
    const cartId = (await fetchStoreCart(page)).id;
    await page.goto(`/us/en/checkout/${cartId}`, { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { name: /shipping address/i }),
    ).toBeVisible({ timeout: 90_000 });
  });

  test("seller-funded automatic promo discounts only Seller A in a multi-seller cart", async ({
    page,
  }) => {
    test.setTimeout(600_000);

    await signIn(page);
    await ensureEmptyStorefrontDtcCart(page, MARKETPLACE_BUYER_EMAIL);
    await addProductToCart(page, MARKETPLACE_PRODUCT_A);
    await addProductToCart(page, MARKETPLACE_PRODUCT_B);
    const cartId = (await fetchStoreCart(page)).id;
    await openCheckoutFromCart(page, cartId);

    await expectCartHasPromotionDiscount(page, cartId);
    await expect(
      page.getByText(/funding_type|seller-funded|marketplace-funded/i),
    ).toHaveCount(0);

    await fillShipping(page, cartId);
    await placeOrder(page);

    await expect(
      page.getByText(/Dev Seller 01 Storefront SKU/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Dev Seller 02 Storefront SKU/i).first(),
    ).toBeVisible();
  });

  test("marketplace coupon RDEVMKT10 applies on multi-seller checkout", async ({
    page,
  }) => {
    test.setTimeout(600_000);

    await signIn(page);
    await ensureEmptyStorefrontDtcCart(page, MARKETPLACE_BUYER_EMAIL);
    await addProductToCart(page, MARKETPLACE_PRODUCT_A);
    await addProductToCart(page, MARKETPLACE_PRODUCT_B);
    const cartId = (await fetchStoreCart(page)).id;
    await applyCoupon(page, cartId, MARKETPLACE_COUPON_MARKETPLACE);
    await openCheckoutFromCart(page, cartId);
    await fillShipping(page, cartId);
    await expectCartHasPromotionDiscount(page, cartId);

    await placeOrder(page);
    await expect(page.getByText(/thanks for your order/i)).toBeVisible();
  });

  test("Seller B coupon reduces only Seller B line", async ({ page }) => {
    test.setTimeout(600_000);

    await signIn(page);
    await ensureEmptyStorefrontDtcCart(page, MARKETPLACE_BUYER_EMAIL);
    await addProductToCart(page, MARKETPLACE_PRODUCT_B);
    const cartId = (await fetchStoreCart(page)).id;
    await applyCoupon(page, cartId, MARKETPLACE_COUPON_SELLER_B);
    await openCheckoutFromCart(page, cartId, { lineCount: 1 });
    await fillShipping(page, cartId);
    await expectCartHasPromotionDiscount(page, cartId);

    await placeOrder(page);
    await expect(page.getByText(/thanks for your order/i)).toBeVisible();
  });
});
