import { expect, type Page, test } from "@playwright/test";
import type { Order, OrderGroup } from "@spree/sdk";
import { BASE_PATH } from "./support";

/**
 * Order-placed page for a checkout that reached several sellers.
 *
 * The E2E backend has no marketplace sellers, so a real checkout can't split.
 * Instead the completion response is planted where checkout leaves it — the
 * sessionStorage cache the page reads before asking the API — so the page
 * renders exactly what it would right after a split checkout completes.
 */

const CART_ID = "cart_e2e_split";

function sellerOrder(overrides: Partial<Order>): Order {
  return {
    email: "shopper@example.com",
    currency: "USD",
    items: [],
    fulfillments: [],
    // A child's payment moves to the group at the split.
    payments: [],
    discounts: [],
    billing_address: null,
    shipping_address: null,
    item_total: "0.0",
    delivery_total: "0.0",
    discount_total: "0.0",
    tax_total: "0.0",
    total: "0.0",
    gift_card_total: "0.0",
    store_credit_total: "0.0",
    // Unpaid on its own — only the group's figure reflects the payment.
    amount_due: overrides.total ?? "0.0",
    ...overrides,
  } as Order;
}

function lineItem(id: string, name: string, total: string) {
  return { id, name, quantity: 1, total, currency: "USD", thumbnail_url: null };
}

const splitCheckout = {
  id: "ogrp_e2e",
  number: "R-E2E-100",
  email: "shopper@example.com",
  currency: "USD",
  item_total: "30.0",
  delivery_total: "10.0",
  discount_total: "0.0",
  tax_total: "0.0",
  total: "40.0",
  gift_card_total: "0.0",
  store_credit_total: "0.0",
  amount_due: "0.0",
  payments: [
    {
      id: "py_e2e",
      status: "completed",
      amount: "40.0",
      source_type: "credit_card",
      source: { brand: "visa", last4: "4242", month: 12, year: 2030 },
    },
  ],
  billing_address: null,
  shipping_address: null,
  orders: [
    sellerOrder({
      id: "or_e2e_1",
      number: "R-E2E-100-1",
      items: [lineItem("li_e2e_1", "E2E Seller One Mug", "20.0")],
      fulfillments: [
        { id: "ful_e2e_1", cost: "5.0", delivery_method: { name: "Ground" } },
      ],
      item_total: "20.0",
      delivery_total: "5.0",
      total: "25.0",
    } as unknown as Partial<Order>),
    sellerOrder({
      id: "or_e2e_2",
      number: "R-E2E-100-2",
      items: [lineItem("li_e2e_2", "E2E Seller Two Tee", "10.0")],
      fulfillments: [
        { id: "ful_e2e_2", cost: "5.0", delivery_method: { name: "Express" } },
      ],
      item_total: "10.0",
      delivery_total: "5.0",
      total: "15.0",
    } as unknown as Partial<Order>),
  ],
} as unknown as OrderGroup;

/** Opens the order-placed page as completion leaves it, with `result` cached. */
async function openOrderPlaced(
  page: Page,
  result: Order | OrderGroup,
): Promise<void> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [`spree_completed_order_${CART_ID}`, JSON.stringify(result)],
  );
  await page.goto(`${BASE_PATH}/order-placed/${CART_ID}`);
}

test("a split checkout shows every seller's delivery under one order", async ({
  page,
}) => {
  await openOrderPlaced(page, splitCheckout);

  // The customer's number is the group's, not one seller's.
  await expect(page.getByText("Order #R-E2E-100", { exact: true })).toBeVisible(
    { timeout: 30_000 },
  );
  await expect(
    page.getByText("Your order is arriving in 2 separate deliveries."),
  ).toBeVisible();

  for (const [index, number, item] of [
    [1, "R-E2E-100-1", "E2E Seller One Mug"],
    [2, "R-E2E-100-2", "E2E Seller Two Tee"],
  ] as const) {
    await expect(
      page.getByRole("heading", { name: `Delivery ${index} of 2` }),
    ).toBeVisible();
    await expect(page.getByText(number, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: item })).toBeVisible();
  }

  // Both sellers' shipping methods, and the group's totals — the whole charge,
  // already paid, rather than one seller's share or an unpaid child's balance.
  await expect(page.getByText("Ground")).toBeVisible();
  await expect(page.getByText("Express")).toBeVisible();
  await expect(page.getByText("$40.00").first()).toBeVisible();
  await expect(page.getByText("Amount due")).toHaveCount(0);
  await expect(page.getByText("Visa ending in 4242")).toBeVisible();
});

test("a single-seller checkout reads as one plain order", async ({ page }) => {
  await openOrderPlaced(page, splitCheckout.orders[0]);

  await expect(
    page.getByText("Order #R-E2E-100-1", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "E2E Seller One Mug" }),
  ).toBeVisible();
  await expect(page.getByText(/separate deliveries/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^Delivery \d/ })).toHaveCount(
    0,
  );
});
