import { expect, type Page, test } from "@playwright/test";
import {
  addToCart,
  BASE_PATH,
  fillShippingAddress,
  payWithStripeTestCard,
  skipWithoutStripe,
  waitForHydration,
} from "./support";

/**
 * A real checkout that reaches two sellers.
 *
 * The basket holds the operator's own product and one from the marketplace
 * seller seeded by bootstrap-spree.sh, so completion divides it into an order
 * group with one order per seller. The order-placed page is checked twice:
 * straight after completion, where it renders the cached completion response,
 * and after a reload, where that cache is spent and the group has to come back
 * from the API through the cart id.
 */

const PRODUCTS = [
  { slug: "e2e-first-party-mug", name: "E2E First-Party Mug" },
  { slug: "e2e-seller-mug", name: "E2E Seller Mug" },
] as const;

test("a checkout spanning two sellers confirms as one order, also after a reload", async ({
  page,
}) => {
  skipWithoutStripe();
  // Stripe's card-fill and submit retries need the same headroom as the
  // single-seller checkout.
  test.setTimeout(300_000);

  let drawer = page.getByRole("dialog", { name: /^cart/i });
  for (const product of PRODUCTS) {
    await page.goto(`${BASE_PATH}/products/${product.slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: product.name }),
    ).toBeVisible({ timeout: 30_000 });
    drawer = await addToCart(page, product.name);
  }

  // The drawer keeps re-rendering as the cart revalidates, so read the
  // checkout link's target and navigate rather than clicking it.
  const checkoutLink = drawer.getByRole("link", { name: /^checkout$/i });
  let checkoutHref: string | null = null;
  await expect(async () => {
    checkoutHref = await checkoutLink.getAttribute("href", { timeout: 3_000 });
    expect(checkoutHref).toBeTruthy();
  }).toPass({ timeout: 30_000 });
  await page.goto(checkoutHref ?? "");

  const email = page.getByPlaceholder(/email address/i);
  await expect(email).toHaveCount(1, { timeout: 20_000 });
  await waitForHydration(email);
  await email.fill(`e2e-split-${Date.now()}@example.com`);
  await fillShippingAddress(page);
  await page.getByRole("heading", { name: /shipping method/i }).click();

  // One shipment per seller, each with a rate already selected.
  await expect(page.getByText("Shipment 2 of 2")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText("Ships from E2E Seller Warehouse", { exact: false }),
  ).toBeVisible();

  await payWithStripeTestCard(page);

  await expectSplitSummary(page);

  // The completion cache is one-time — the reload asks the API.
  await page.reload();
  await expectSplitSummary(page);
});

async function expectSplitSummary(page: Page): Promise<void> {
  await expect(
    page.getByText("Your order is arriving in 2 separate deliveries."),
  ).toBeVisible({ timeout: 30_000 });

  // The customer's number is the group's; each delivery carries its order's.
  const orderNumber = page.getByText(/^Order #/);
  await expect(orderNumber).toBeVisible();
  const groupNumber = (await orderNumber.textContent())?.replace(
    /^Order #/,
    "",
  );
  expect(groupNumber).toBeTruthy();

  for (const index of [1, 2]) {
    await expect(
      page.getByRole("heading", { name: `Delivery ${index} of 2` }),
    ).toBeVisible();
    await expect(
      page.getByText(`${groupNumber}-${index}`, { exact: true }),
    ).toBeVisible();
  }
  for (const product of PRODUCTS) {
    await expect(
      page.getByRole("heading", { name: product.name }),
    ).toBeVisible();
  }

  // Paid once, against the group — the card shows, and nothing is left due.
  await expect(page.getByText(/ending in 4242/)).toBeVisible();
  await expect(page.getByText("Amount due")).toHaveCount(0);
}
