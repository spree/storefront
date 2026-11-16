import { expect, test } from "@playwright/test";
import {
  MARKETPLACE_PRODUCT_A,
  requireLabStoreApiUrl,
  storefrontGoto,
} from "./marketplace-fixtures";
import { addProductToCart } from "./pdp-helpers";
import { fetchStoreCart } from "./store-cart";

const RUN = process.env.ENTERPRISE_A11Y_E2E === "1";

test.describe("enterprise a11y preflight", () => {
  test.beforeAll(() => {
    requireLabStoreApiUrl();
  });

  test.skip(!RUN, "Set ENTERPRISE_A11Y_E2E=1");

  const surfaces = [
    { name: "homepage", path: "/us/en" },
    { name: "category", path: "/us/en/c/dev-merch-fixtures" },
    { name: "product", path: MARKETPLACE_PRODUCT_A },
    { name: "seller", path: "/us/en/sellers/dev-seller-01" },
  ];

  for (const surface of surfaces) {
    test(`${surface.name} renders main landmark`, async ({ page }) => {
      await storefrontGoto(page, surface.path);
      await expect(page.getByRole("main")).toBeVisible({ timeout: 60_000 });
      if (surface.name === "product") {
        await expect(
          page.getByRole("main").getByRole("heading", { level: 1 }),
        ).toBeVisible();
      }
    });
  }

  test("checkout shell and sections render", async ({ page }) => {
    await addProductToCart(page, MARKETPLACE_PRODUCT_A);
    const cart = await fetchStoreCart(page);
    await storefrontGoto(page, `/us/en/checkout/${cart.id}`);
    await expect(page.getByRole("main")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#checkout-section-address")).toBeVisible();
    await expect(page.locator("#checkout-section-delivery")).toBeVisible();
    await expect(page.locator("#checkout-section-payment")).toBeVisible();
  });
});
