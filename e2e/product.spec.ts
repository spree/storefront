import { expect, type Page, test } from "@playwright/test";
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

// Created by scripts/e2e/bootstrap-spree.sh: black in S, M and L, red in S and
// M only. Everything is $20 except red M, on sale at $15 instead of $25, and
// black L is sold out.
test.describe("product page with color and size options", () => {
  const name = "E2E Two-Option Tee";

  function detail(page: Page, term: string) {
    return page
      .getByRole("main")
      .getByRole("term")
      .filter({ hasText: new RegExp(`^${term}$`) })
      .locator("xpath=following-sibling::*[1]");
  }

  // A sold-out size carries "(Out of stock)" in its name.
  function size(page: Page, label: string) {
    return page
      .getByRole("main")
      .getByRole("button", { name: new RegExp(`^${label}\\b`) });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/products/e2e-two-option-tee`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
      timeout: 30_000,
    });
    await expect(detail(page, "Options")).toHaveText("Color: Black, Size: S");
    await waitForHydration(size(page, "M"));
  });

  test("picking a color and a size adds that combination to the cart", async ({
    page,
  }) => {
    await expect(size(page, "L")).toBeEnabled();

    await page.getByRole("main").getByTitle("Red", { exact: true }).click();
    await expect(detail(page, "Options")).toHaveText("Color: Red, Size: S", {
      timeout: 30_000,
    });
    await expect(detail(page, "SKU")).toHaveText("E2E-TEE-RED-S");
    // Red does not come in L.
    await expect(size(page, "L")).toBeDisabled();

    await size(page, "M").click();
    await expect(detail(page, "Options")).toHaveText("Color: Red, Size: M");
    await expect(detail(page, "SKU")).toHaveText("E2E-TEE-RED-M");

    const drawer = await addToCart(page, name);
    await expect(drawer.getByText("Color: Red, Size: M")).toBeVisible();
  });

  test("a discounted variant shows its sale price, and the cart charges it", async ({
    page,
  }) => {
    const main = page.getByRole("main");
    await expect(main.getByText("$20.00", { exact: true })).toBeVisible();
    await expect(main.getByText("Sale", { exact: true })).toBeHidden();

    await main.getByTitle("Red", { exact: true }).click();
    await size(page, "M").click();
    await expect(detail(page, "Options")).toHaveText("Color: Red, Size: M", {
      timeout: 30_000,
    });
    await expect(main.getByText("$15.00", { exact: true })).toBeVisible();
    await expect(main.getByText("$25.00", { exact: true })).toBeVisible();
    await expect(main.getByText("Sale", { exact: true })).toBeVisible();

    await size(page, "S").click();
    await expect(main.getByText("$20.00", { exact: true })).toBeVisible();
    await expect(main.getByText("Sale", { exact: true })).toBeHidden();
    await expect(main.getByText("$25.00", { exact: true })).toBeHidden();

    await size(page, "M").click();
    const drawer = await addToCart(page, name);
    await expect(drawer.getByText("$15.00").first()).toBeVisible();
  });

  test("a sold-out variant can be picked but not added to the cart", async ({
    page,
  }) => {
    const main = page.getByRole("main");
    const addButton = main.getByRole("button", { name: /add to cart/i });
    await expect(addButton).toBeEnabled();
    await expect(size(page, "L")).toHaveText(/out of stock/i);
    await expect(size(page, "M")).not.toHaveText(/out of stock/i);

    await size(page, "L").click();
    await expect(detail(page, "Options")).toHaveText("Color: Black, Size: L", {
      timeout: 30_000,
    });
    await expect(main.getByText("Out of Stock", { exact: true })).toHaveCount(
      2,
    );
    await expect(
      main.getByRole("button", { name: "Out of Stock", exact: true }),
    ).toBeDisabled();
    await expect(addButton).toBeHidden();
    // Red does not come in L, so it cannot be combined with this size.
    await expect(main.getByTitle("Red", { exact: true })).toBeDisabled();

    await size(page, "M").click();
    await expect(main.getByText("In Stock", { exact: true })).toBeVisible();
    await expect(addButton).toBeEnabled();
  });
});
