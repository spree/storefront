import {
  expect,
  type FrameLocator,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

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

/** Fills the checkout's shipping address with a valid New York address. */
export async function fillShippingAddress(page: Page): Promise<void> {
  // The Country dropdown defaults alphabetically (Canada before US) — pick
  // United States explicitly so the rest of the test data (NY state, ZIP
  // 10001, US phone) is valid for the selected country.
  await page.getByLabel(/country/i).selectOption({ label: "United States" });

  await page
    .getByLabel(/first name/i)
    .first()
    .fill("Test");
  await page
    .getByLabel(/last name/i)
    .first()
    .fill("Buyer");
  await page
    .getByLabel(/^address$/i)
    .first()
    .fill("123 Test St");
  await page.getByLabel(/city/i).first().fill("New York");
  await page
    .getByLabel(/zip|postal code/i)
    .first()
    .fill("10001");
  await page.getByLabel(/phone/i).first().fill("5555550100");

  // With the country pinned to US the state field is always a <select>
  // (disabled while the states list loads). selectOption auto-waits for
  // the control to enable and for the option to be present.
  await page
    .getByLabel(/state|province/i)
    .first()
    .selectOption({ label: "New York" });
}

const TEST_CARD = "4242424242424242";

/**
 * Skips the calling test when the backend was bootstrapped without Stripe —
 * runs that get no secrets (forks, Dependabot) still run every other spec.
 * Same-repo CI runs fail before this point when the keys are missing.
 */
export function skipWithoutStripe(): void {
  test.skip(
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    "Stripe test keys are not configured for this run",
  );
}

/**
 * Pays on the checkout page with a Stripe test card and places the order,
 * returning once the order-placed page is reached. Expects shipping to be
 * chosen already — the Payment Element only mounts after that.
 */
export async function payWithStripeTestCard(page: Page): Promise<void> {
  // Pay with a Stripe test card. The Payment Element only renders
  //    after a session-based payment method is selected, which only
  //    appears once shipping is locked in. Two hazards make this step a
  //    retry loop rather than a linear fill:
  //    - Several Stripe iframes share the "Secure payment input frame"
  //      title (an accessory frame mounts lazily next to the real form),
  //      so the card form's frame must be re-resolved every attempt — a
  //      fill aimed at the wrong frame "succeeds" silently while the real
  //      card field stays empty.
  //    - PaymentSection recreates the payment session whenever the cart
  //      total changes (e.g. the shipping-rate save landing after the
  //      Payment Element mounted), which remounts the Element and wipes
  //      anything already typed.
  //    Only values that still sit in the form after a settle pause are
  //    really in the form Pay Now will submit — anything else means a
  //    remount raced the fill, and the attempt runs again.
  const stripeFrames = page.locator(
    'iframe[title="Secure payment input frame"]',
  );

  const resolveCardFrame = async (): Promise<FrameLocator> => {
    const frameCount = await stripeFrames.count();
    for (let i = 0; i < frameCount; i++) {
      const frame = stripeFrames.nth(i).contentFrame();
      if (await frame.getByRole("textbox", { name: "Card number" }).count()) {
        return frame;
      }
    }
    throw new Error("Card form has not rendered in any Stripe frame yet");
  };

  const fillCardForm = async (): Promise<void> => {
    const cardFrame = await resolveCardFrame();
    // fill() replaces the existing value, so re-running an attempt on an
    // already-correct form is safe. Bounded action timeouts keep a
    // mid-attempt remount from stalling the whole loop.
    const cardNumber = cardFrame.getByRole("textbox", { name: "Card number" });
    await cardNumber.fill(TEST_CARD, { timeout: 10_000 });
    // The expiry field's accessible name varies across Payment Element
    // mounts ("Expiration date" vs "Expiration (MM/YY)"); the placeholder
    // is the stable handle.
    const expiry = cardFrame.getByPlaceholder("MM / YY");
    await expiry.fill("12 / 30", { timeout: 10_000 });
    const cvc = cardFrame.getByRole("textbox", { name: "Security code" });
    await cvc.fill("123", { timeout: 10_000 });
    // US card forms include their own required ZIP field (distinct from
    // the shipping address) — Pay Now fails validation if it stays blank.
    const zip = cardFrame.getByRole("textbox", { name: /zip code/i });
    if (await zip.count()) {
      await zip.fill("10001", { timeout: 10_000 });
    }
    // A remount wipes the fields a beat after the fill "succeeds" — only
    // accept values that survive the pause. (Stripe formats the number
    // with spaces, hence the patterns.)
    await page.waitForTimeout(1_500);
    await expect(cardNumber).toHaveValue(/4242/, { timeout: 2_000 });
    await expect(expiry).toHaveValue(/12/, { timeout: 2_000 });
    await expect(cvc).toHaveValue("123", { timeout: 2_000 });
  };

  await expect(fillCardForm).toPass({ timeout: 60_000 });

  // Accept policies + submit. A remount can still land between the
  //    fill loop and the click, leaving Pay Now to fail inline validation
  //    against an emptied form — so re-verify the fill and click again on
  //    a timed-out attempt instead of waiting a full minute on a submit
  //    that can no longer succeed.
  await page.getByRole("checkbox", { name: /i agree/i }).check();

  await expect(async () => {
    // A prior attempt's submit may have landed while its waitForURL had
    // already timed out — never re-pay a completed order.
    if (/\/order-placed\//.test(page.url())) return;
    await fillCardForm();
    await page
      .getByRole("button", { name: /pay now|place order/i })
      .click({ timeout: 10_000 });
    await page.waitForURL(/\/order-placed\//, { timeout: 30_000 });
  }).toPass({ timeout: 150_000, intervals: [1_000] });
}
