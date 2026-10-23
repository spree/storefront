import { expect, type Locator, type Page } from "@playwright/test";

export const BASE_PATH = "/us/en";
export const PASSWORD = "spree123!";

/**
 * Waits until React has hydrated an element. A click or submit that lands
 * before hydration is lost (a button does nothing) or, for a form, falls back
 * to a native GET submit that reloads the page with the fields in the URL.
 * React tags every hydrated DOM node with a `__reactFiber$…` key.
 */
export async function waitForHydration(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      () =>
        locator.evaluate((element) =>
          Object.keys(element).some((key) => key.startsWith("__reactFiber")),
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
}

/** The form submitted by the named button (the header holds a search form too). */
export function formWithButton(page: Page, button: string): Locator {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: button }) });
}

/** The first top-level category in the category navigation. */
async function firstCategory(
  page: Page,
): Promise<{ name: string; href: string }> {
  await page.goto(BASE_PATH);
  const link = page
    .getByRole("navigation", { name: "Category navigation" })
    .getByRole("link")
    .first();
  return {
    name: (await link.textContent())?.trim() ?? "",
    href: (await link.getAttribute("href")) ?? BASE_PATH,
  };
}

/** Opens the first top-level category page and returns its name. */
export async function openFirstCategory(page: Page): Promise<string> {
  const { name, href } = await firstCategory(page);
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
    timeout: 30_000,
  });
  return name;
}

/**
 * Opens a category through the header menu: the first top-level category, or
 * its first subcategory when it has a panel of them. Returns the name of the
 * category opened.
 */
export async function openCategoryFromMenu(page: Page): Promise<string> {
  const { name: topLevel } = await firstCategory(page);
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await waitForHydration(menuButton);
  await menuButton.click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  // Scoped to the menu's list: a category's panel has a back button that
  // carries the category's name too.
  const list = menu.getByRole("navigation").first();
  const categoryButton = list.getByRole("button", {
    name: topLevel,
    exact: true,
  });

  let target = list.getByRole("link", { name: topLevel, exact: true });
  await expect(categoryButton.or(target)).toBeVisible({ timeout: 10_000 });
  if (await categoryButton.count()) {
    // The subcategory panel is the menu list without the "All Products" link.
    // A click landing while the menu is still sliding in is lost.
    const subcategory = menu
      .getByRole("navigation")
      .filter({ hasNot: page.getByRole("link", { name: "All Products" }) })
      .getByRole("link")
      .first();
    await expect(async () => {
      if (!(await subcategory.isVisible())) {
        await categoryButton.click({ timeout: 3_000 });
      }
      await expect(subcategory).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    target = subcategory;
  }

  const name = (await target.textContent())?.trim() ?? "";
  await target.click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
    timeout: 30_000,
  });
  return name;
}

/** Opens the first product listed on a listing page and returns its name. */
export async function openFirstProduct(
  page: Page,
  listingPath: string,
): Promise<string> {
  await page.goto(listingPath);
  const firstProduct = page
    .getByRole("heading", { level: 3 })
    .getByRole("link")
    .first();
  await waitForHydration(firstProduct);
  const name = (await firstProduct.textContent())?.trim() ?? "";
  await firstProduct.click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
    timeout: 30_000,
  });
  return name;
}

/**
 * Adds the product on the current product page to the cart and waits for the
 * cart drawer to list it. Returns the drawer.
 */
export async function addToCart(page: Page, name: string): Promise<Locator> {
  const addButton = page.getByRole("button", { name: /add to cart/i });
  await waitForHydration(addButton);
  await expect(addButton).toBeEnabled({ timeout: 10_000 });
  await addButton.click();

  const drawer = page.getByRole("dialog", { name: /^cart/i });
  await expect(drawer.getByRole("link", { name })).toBeVisible({
    timeout: 30_000,
  });
  return drawer;
}

/** Signs a new customer up through the registration form. */
export async function signUp(
  page: Page,
  { firstName = "E2E", lastName = "Customer" } = {},
): Promise<{ email: string; password: string }> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto(`${BASE_PATH}/account/register`);
  await waitForHydration(formWithButton(page, "Create Account"));
  await page.getByRole("textbox", { name: "First name" }).fill(firstName);
  await page.getByRole("textbox", { name: "Last name" }).fill(lastName);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(PASSWORD);
  await page.getByRole("textbox", { name: "Confirm Password" }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: /i agree/i }).check();
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(
    page.getByRole("heading", { name: "Account Overview" }),
  ).toBeVisible({ timeout: 30_000 });
  return { email, password: PASSWORD };
}

/** Fills the sign-in form on the current page and submits it. */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await waitForHydration(formWithButton(page, "Sign In"));
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}
