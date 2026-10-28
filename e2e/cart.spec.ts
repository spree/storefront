import { expect, test } from "@playwright/test";
import {
  addToCart,
  BASE_PATH,
  openFirstProduct,
  waitForHydration,
} from "./support";

test.describe("cart page", () => {
  test("an empty cart points back to the catalog", async ({ page }) => {
    await page.goto(`${BASE_PATH}/cart`);
    await expect(
      page.getByRole("heading", { name: "Your cart is empty" }),
    ).toBeVisible({ timeout: 30_000 });

    const continueShopping = page.getByRole("link", {
      name: "Continue Shopping",
    });
    await waitForHydration(continueShopping);
    await continueShopping.click();
    await expect(page).toHaveURL(/\/products$/);
  });

  test("a customer changes the quantity and removes the item", async ({
    page,
  }) => {
    const name = await openFirstProduct(page, `${BASE_PATH}/products`);
    await addToCart(page, name);

    await page.goto(`${BASE_PATH}/cart`);
    await expect(
      page.getByRole("heading", { name: "Shopping Cart" }),
    ).toBeVisible({ timeout: 30_000 });
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name })).toBeVisible();

    const subtotal = main
      .getByRole("term")
      .filter({ hasText: /^Subtotal$/ })
      .locator("xpath=following-sibling::*[1]");
    const initialSubtotal = (await subtotal.textContent())?.trim() ?? "";

    const increase = main.getByRole("button", { name: "Increase quantity" });
    await waitForHydration(increase);
    await increase.click();
    await expect(main.getByRole("textbox", { name: "Quantity" })).toHaveValue(
      "2",
      { timeout: 30_000 },
    );
    await expect(subtotal).not.toHaveText(initialSubtotal, { timeout: 30_000 });

    await expect(
      main.getByRole("link", { name: "Proceed to Checkout" }),
    ).toBeVisible();

    await main.getByRole("button", { name: `Remove ${name}` }).click();
    await expect(
      page.getByRole("heading", { name: "Your cart is empty" }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
