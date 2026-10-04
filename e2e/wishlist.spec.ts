import { expect, type Page, test } from "@playwright/test";

/**
 * Wishlist E2E coverage.
 *
 * 1) Guests are redirected to account sign-in/register when trying to wishlist.
 * 2) Authenticated customers can add and remove wishlist items and see empty state.
 */

const BASE = "/us/en";

test("guest is redirected to account when clicking wishlist on PDP", async ({
  page,
}): Promise<void> => {
  await page.goto(`${BASE}/products`);

  const firstProduct = page.locator('a[href*="/products/"]').first();
  await expect(firstProduct).toBeVisible({ timeout: 15_000 });
  await firstProduct.click();
  await page.waitForURL(/\/products\/[^/]+/);

  const productPath = new URL(page.url()).pathname;

  await page.getByRole("button", { name: /add to wishlist/i }).click();

  await expect(page).toHaveURL(/\/us\/en\/account\?redirect=/);

  const redirectParam = new URL(page.url()).searchParams.get("redirect");
  expect(redirectParam).toBe(productPath);
});

test("authenticated user can add and remove a wishlist item", async ({
  page,
}): Promise<void> => {
  const email = `wishlist-e2e-${Date.now()}@example.com`;
  const password = "Password123!";

  await registerUser(page, email, password);

  await page.goto(`${BASE}/products`);
  const firstProduct = page.locator('a[href*="/products/"]').first();
  await expect(firstProduct).toBeVisible({ timeout: 15_000 });
  await firstProduct.click();
  await page.waitForURL(/\/products\/[^/]+/);

  const addButton = page.getByRole("button", { name: /add to wishlist/i });
  await expect(addButton).toBeVisible();
  await addButton.click();

  await expect(
    page.getByRole("button", {
      name: /added to wishlist|remove from wishlist/i,
    }),
  ).toBeVisible({ timeout: 10_000 });

  await page.goto(`${BASE}/wishlist`);
  await expect(
    page.getByRole("heading", { name: /my wishlist/i }),
  ).toBeVisible();

  const removeButton = page.getByRole("button", { name: /^remove$/i }).first();
  await expect(removeButton).toBeVisible();
  await removeButton.click();

  await expect(
    page.getByRole("heading", { name: /your wishlist is empty/i }),
  ).toBeVisible({ timeout: 10_000 });
});

async function registerUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${BASE}/account/register`);

  await page.getByLabel(/^first name$/i).fill("Wishlist");
  await page.getByLabel(/^last name$/i).fill("Tester");
  await page.getByLabel(/^email$/i).fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#passwordConfirmation").fill(password);

  await page.getByRole("checkbox", { name: /i agree to the/i }).check();
  await page.getByRole("button", { name: /^create account$/i }).click();

  await expect(page).toHaveURL(/\/us\/en\/account$/);
}
