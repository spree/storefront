import { expect, test } from "@playwright/test";
import {
  addToCart,
  BASE_PATH,
  fillShippingAddress,
  payWithStripeTestCard,
  signUp,
  skipWithoutStripe,
} from "./support";

/**
 * Checkout golden-path E2E.
 *
 * Walks a guest user through products listing → PDP → cart → checkout,
 * fills the shipping address, selects a delivery rate, pays with a Stripe
 * test card, and confirms the order-placed page renders.
 *
 * Backend: e2e-backend/docker-compose.yml (Spree 5.4.3.1 with sample data).
 * Payments: real Stripe test mode (pk_test_...) — card 4242 4242 4242 4242.
 *
 * Run with: pnpm run e2e:up && pnpm run test:e2e
 */

const TEST_EMAIL = "e2e-buyer@example.com";

test("guest can complete a checkout with a Stripe test card", async ({
  page,
}) => {
  skipWithoutStripe();
  // The card-fill and submit steps below are retry loops (the Payment
  // Element can remount mid-flow and wipe typed input) — they need
  // headroom beyond the config's 120s budget.
  test.setTimeout(300_000);
  // 1. Open the products listing and pick the first available product.
  //    A click landing mid-hydration can be swallowed with the page staying
  //    put — so the click-then-navigate pair is a bounded retry, not one
  //    unbounded wait.
  await page.goto("/us/en/products");
  const firstProduct = page.locator('a[href*="/products/"]').first();
  await expect(firstProduct).toBeVisible({ timeout: 15_000 });
  await expect(async () => {
    if (!/\/products\/[^/]+/.test(page.url())) {
      await firstProduct.click({ timeout: 5_000 });
    }
    await page.waitForURL(/\/products\/[^/]+/, { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });

  // 2. Add to cart from the PDP. The cart drawer opens automatically after
  // the server action resolves and the cart cookie is set — wait for the
  // drawer's Checkout link rather than racing the navigation by going
  // straight to /cart (which would race the cookie write).
  const addToCart = page.getByRole("button", { name: /add to cart/i });
  await expect(addToCart).toBeEnabled({ timeout: 10_000 });
  await addToCart.click();

  // The drawer normally auto-opens once the server action resolves, but both
  // the add itself and the auto-open can be lost to hydration. Check the
  // drawer first: while it's open, the rest of the page is aria-hidden, so
  // the header cart button is only consultable when the drawer is closed —
  // its badge then tells a swallowed add (re-add) apart from a lost
  // auto-open (open the drawer manually). The drawer also keeps
  // re-rendering as the cart revalidates (its Express Checkout widget
  // remounts), which can detach the link mid-click indefinitely — so read
  // the link's target inside the retry and navigate to it instead of
  // clicking it.
  const cartButton = page.getByRole("button", { name: /open cart/i });
  const drawerCheckout = page
    .getByRole("dialog")
    .getByRole("link", { name: /^checkout$/i });
  let checkoutHref: string | null = null;
  await expect(async () => {
    if (!(await drawerCheckout.count())) {
      const badge = (await cartButton.textContent({ timeout: 3_000 })) ?? "";
      if (/\d/.test(badge)) {
        await cartButton.click({ timeout: 3_000 });
      } else {
        await addToCart.click({ timeout: 3_000 });
      }
    }
    await expect(drawerCheckout).toBeVisible({ timeout: 5_000 });
    checkoutHref = await drawerCheckout.getAttribute("href", {
      timeout: 3_000,
    });
    if (!checkoutHref) {
      throw new Error("Drawer checkout link has no href");
    }
  }).toPass({ timeout: 45_000 });
  if (!checkoutHref) {
    throw new Error("Drawer checkout link has no href");
  }
  await page.goto(checkoutHref);

  // 3. Fill contact + shipping address. The checkout is single-page with
  // auto-save: address persists on container blur (no explicit "Continue"
  // button). Email input has no <label> — its accessible name comes from
  // `placeholder`, so use getByPlaceholder.
  // The streamed checkout page transiently holds two copies of the contact
  // form while hydrating — wait for the duplicate to collapse before
  // filling anything.
  const email = page.getByPlaceholder(/email address/i);
  await expect(email).toHaveCount(1, { timeout: 20_000 });
  await email.fill(TEST_EMAIL);
  await fillShippingAddress(page);

  // Trigger the address auto-save by blurring the form. Clicking the
  // page heading takes focus out of the AddressFormFields container,
  // which fires handleContainerBlur → tryAutoSave.
  await page.getByRole("heading", { name: /shipping method/i }).click();

  // 4. Pick the first available shipping rate. Spree sample data ships
  //    with at least one rate for US destinations.
  const firstRate = page.getByRole("radio").first();
  await expect(firstRate).toBeVisible({ timeout: 30_000 });
  await firstRate.check();

  // 5–6. Pay with a Stripe test card and place the order.
  await payWithStripeTestCard(page);

  // 7. Confirm the order summary rendered.
  await expect(page.getByText(/order #/i)).toBeVisible();

  // 8. Reopening the checkout link of the order just placed leads back to its
  //    order-placed page, not to a checkout form for the items already bought.
  const orderPlacedUrl = page.url();
  await page.goto(checkoutHref);
  await expect(page).toHaveURL(orderPlacedUrl, { timeout: 30_000 });
});

test("a customer who reopens a placed order's checkout link sees the order", async ({
  page,
}) => {
  skipWithoutStripe();
  test.setTimeout(300_000);
  await signUp(page);

  // Seeded by scripts/e2e/bootstrap-spree.sh.
  const product = { slug: "e2e-first-party-mug", name: "E2E First-Party Mug" };
  await page.goto(`${BASE_PATH}/products/${product.slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: product.name }),
  ).toBeVisible({ timeout: 30_000 });
  const drawer = await addToCart(page, product.name);

  const checkoutLink = drawer.getByRole("link", { name: /^checkout$/i });
  let checkoutHref = "";
  await expect(async () => {
    checkoutHref =
      (await checkoutLink.getAttribute("href", { timeout: 3_000 })) ?? "";
    expect(checkoutHref).toBeTruthy();
  }).toPass({ timeout: 30_000 });
  await page.goto(checkoutHref);

  // Signed in, checkout asks for no email; wait for the streamed duplicate of
  // the address form to collapse instead.
  await expect(page.getByLabel(/country/i)).toHaveCount(1, { timeout: 20_000 });
  await fillShippingAddress(page);
  await page.getByRole("heading", { name: /shipping method/i }).click();
  const firstRate = page.getByRole("radio").first();
  await expect(firstRate).toBeVisible({ timeout: 30_000 });
  await firstRate.check();
  await payWithStripeTestCard(page, { signedIn: true });
  await expect(page.getByText(/order #/i)).toBeVisible();

  const orderPlacedUrl = page.url();
  await page.goto(checkoutHref);
  await expect(page).toHaveURL(orderPlacedUrl, { timeout: 30_000 });
  await expect(page.getByText(/order #/i)).toBeVisible();
});
