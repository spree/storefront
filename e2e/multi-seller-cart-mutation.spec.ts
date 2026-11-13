import { expect, test } from "@playwright/test";
import { loginBuyerViaApi } from "./buyer-auth";
import {
  ensureMarketplaceDataset,
  MARKETPLACE_BUYER_EMAIL,
  MARKETPLACE_BUYER_PASSWORD,
  MARKETPLACE_PRODUCT_A,
  SELLER_A_PRODUCT_SLUG,
  storefrontGoto,
} from "./marketplace-fixtures";
import { addProductToCart } from "./pdp-helpers";
import {
  assertBuyerCart,
  assertCartContainsProductSlug,
  ensureEmptyStorefrontDtcCart,
  fetchStoreCart,
} from "./store-cart";

/**
 * Focused regression: API-provisioned cart cookies stay aligned after a UI add-to-cart.
 */
test.describe("multi-seller cart mutation", () => {
  test("authenticated UI add persists variant on the provisioned cart", async ({
    page,
  }) => {
    test.setTimeout(600_000);

    await ensureMarketplaceDataset(page);
    await loginBuyerViaApi(
      page,
      MARKETPLACE_BUYER_EMAIL,
      MARKETPLACE_BUYER_PASSWORD,
      {
        requireAccountShell: true,
      },
    );
    await ensureEmptyStorefrontDtcCart(page, MARKETPLACE_BUYER_EMAIL);

    await addProductToCart(page, MARKETPLACE_PRODUCT_A);
    const cartId = (await fetchStoreCart(page)).id;
    const cart = await assertBuyerCart(
      page,
      MARKETPLACE_BUYER_EMAIL,
      cartId,
      1,
    );
    assertCartContainsProductSlug(cart, SELLER_A_PRODUCT_SLUG);

    await storefrontGoto(page, "/us/en");
    const reloaded = await fetchStoreCart(page);
    expect(reloaded.id).toBe(cartId);
    assertCartContainsProductSlug(reloaded, SELLER_A_PRODUCT_SLUG);
    await assertBuyerCart(page, MARKETPLACE_BUYER_EMAIL, cartId, 1);
  });
});
