import type { Order, OrderGroup } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import { toPurchase } from "../purchase";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "or_1",
    number: "R1033-1",
    email: "shopper@example.com",
    currency: "USD",
    items: [],
    fulfillments: [],
    payments: [],
    discounts: [],
    fees: [],
    billing_address: null,
    shipping_address: null,
    gift_card: null,
    market: null,
    item_total: "7.0",
    display_item_total: "$7.00",
    delivery_total: "5.0",
    display_delivery_total: "$5.00",
    discount_total: "0.0",
    display_discount_total: "$0.00",
    tax_total: "0.0",
    display_tax_total: "$0.00",
    total: "12.0",
    display_total: "$12.00",
    gift_card_total: "0.0",
    display_gift_card_total: "$0.00",
    store_credit_total: "0.0",
    display_store_credit_total: "$0.00",
    amount_due: "0.0",
    display_amount_due: "$0.00",
    ...overrides,
  } as Order;
}

function lineItem(id: string, name: string) {
  return { id, name, quantity: 1, total: "7.0", currency: "USD" };
}

describe("toPurchase", () => {
  it("reads a single-seller checkout straight off the order", () => {
    const single = order({
      items: [lineItem("li_1", "Apple")] as Order["items"],
    });

    const purchase = toPurchase(single);

    expect(purchase.split).toBe(false);
    expect(purchase.number).toBe("R1033-1");
    expect(purchase.segments).toHaveLength(1);
    expect(
      purchase.segments.flatMap((segment) => segment.items).map((i) => i.name),
    ).toEqual(["Apple"]);
    // The order's own figures, untouched — no re-derivation when there is
    // nothing to roll up.
    expect(purchase.totals).toBe(single);
  });

  const group: OrderGroup = {
    id: "ogrp_1",
    number: "R1033",
    email: "shopper@example.com",
    currency: "USD",
    item_total: "10.5",
    display_item_total: "$10.50",
    total: "20.5",
    display_total: "$20.50",
    fulfillment_status: "unfulfilled",
    payment_status: "paid",
    completed_at: "2026-10-09T11:44:07.334Z",
    billing_address: null,
    shipping_address: null,
    orders: [
      order({
        id: "or_1",
        number: "R1033-1",
        items: [lineItem("li_1", "Apple")] as Order["items"],
        fulfillments: [{ id: "ful_1" }] as Order["fulfillments"],
      }),
      order({
        id: "or_2",
        number: "R1033-2",
        items: [lineItem("li_2", "Potato")] as Order["items"],
        fulfillments: [{ id: "ful_2" }] as Order["fulfillments"],
        item_total: "3.5",
        display_item_total: "$3.50",
        total: "8.5",
        display_total: "$8.50",
        tax_total: "1.25",
      }),
    ],
  } as OrderGroup;

  it("keeps every seller's items when the checkout split", () => {
    const purchase = toPurchase(group);

    expect(purchase.split).toBe(true);
    expect(purchase.number).toBe("R1033");
    expect(
      purchase.segments.flatMap((segment) => segment.items).map((i) => i.name),
    ).toEqual(["Apple", "Potato"]);
    expect(purchase.segments.map((segment) => segment.number)).toEqual([
      "R1033-1",
      "R1033-2",
    ]);
    expect(purchase.fulfillments).toHaveLength(2);
  });

  // The group rolls its children's figures up itself — and the payment-side
  // ones (gift card, store credit, amount due) exist only on the group.
  it("takes the totals from the group itself", () => {
    const { totals } = toPurchase(group);

    expect(totals).toBe(group);
  });

  // A split checkout's payment belongs to the group; each child serializes an
  // empty list, so rolling those up would say the customer never paid.
  it("shows the payment the group holds, and nothing when it holds none", () => {
    const paid = {
      ...group,
      payments: [{ id: "py_1", status: "completed" }],
    } as unknown as OrderGroup;

    expect(toPurchase(paid).payments).toHaveLength(1);
    expect(toPurchase(group).payments).toEqual([]);
  });
});
