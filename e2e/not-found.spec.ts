import { expect, type Page, test } from "@playwright/test";
import { BASE_PATH, waitForHydration } from "./support";

const missing = `missing-${Date.now()}`;

async function expectNotFoundPage(page: Page, path: string): Promise<void> {
  const response = await page.goto(`${BASE_PATH}${path}`);

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
}

test.describe("not found page", () => {
  test("a missing product answers 404 inside the storefront layout", async ({
    page,
  }) => {
    await expectNotFoundPage(page, `/products/${missing}`);
  });

  test("a missing category answers 404", async ({ page }) => {
    await expectNotFoundPage(page, `/c/${missing}`);
  });

  test("a missing policy answers 404", async ({ page }) => {
    await expectNotFoundPage(page, `/policies/${missing}`);
  });

  test("an unknown page answers 404", async ({ page }) => {
    await expectNotFoundPage(page, `/${missing}/${missing}`);
  });

  test("stays on the 404 page once the cart and session load", async ({
    page,
  }) => {
    let pageLoads = 0;
    page.on("request", (request) => {
      if (request.isNavigationRequest()) pageLoads++;
    });

    await expectNotFoundPage(page, `/products/${missing}`);
    await waitForHydration(
      page.getByRole("link", { name: "Browse all products" }),
    );
    // Give the cart and session providers time to finish their first sync.
    await page.waitForLoadState("networkidle");

    expect(pageLoads).toBe(1);
  });

  test("links back into the catalog", async ({ page }) => {
    await expectNotFoundPage(page, `/products/${missing}`);

    const browse = page.getByRole("link", { name: "Browse all products" });
    await waitForHydration(browse);
    await browse.click();

    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/products$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "All Products" }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
