import { expect, test } from "@playwright/test";
import {
  addToCart,
  BASE_PATH,
  openFirstProduct,
  waitForHydration,
} from "./support";

test.describe("product page", () => {
  test("shows the product's price, availability and details", async ({
    page,
  }) => {
    await openFirstProduct(page, `${BASE_PATH}/products`);

    await expect(page.getByText(/\$\d/).first()).toBeVisible();
    await expect(page.getByText(/in stock/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeVisible();
  });

  test("choosing another color switches the variant", async ({ page }) => {
    await openFirstProduct(page, `${BASE_PATH}/products`);
    // Color swatches are named by their title.
    const swatches = page.getByRole("main").locator("button[title]:enabled");
    test.skip(
      (await swatches.count()) < 2,
      "The first product has no second color to switch to",
    );
    const color = (await swatches.nth(1).getAttribute("title")) ?? "";
    const sku = page
      .getByRole("term")
      .filter({ hasText: /^SKU$/ })
      .locator("xpath=following-sibling::*[1]");
    const initialSku = (await sku.textContent())?.trim();

    await waitForHydration(swatches.nth(1));
    await swatches.nth(1).click();

    await expect(
      page.getByRole("definition").filter({ hasText: `: ${color}` }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(sku).not.toHaveText(initialSku ?? "");
  });

  test("adds the chosen quantity to the cart", async ({ page }) => {
    const name = await openFirstProduct(page, `${BASE_PATH}/products`);
    const quantity = page.getByRole("textbox", { name: "Quantity" });
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(quantity).toHaveValue("2");

    const drawer = await addToCart(page, name);
    await expect(drawer.getByRole("textbox", { name: "Quantity" })).toHaveValue(
      "2",
    );
    await expect(
      drawer.getByRole("heading", { name: /2 items/ }),
    ).toBeVisible();
  });
});
