/**
 * One checkout, however many orders it produced.
 *
 * A basket that reaches more than one seller is divided at completion into one
 * order per seller, held together by an order group (R1033 → R1033-1, R1033-2).
 * The API answers such a checkout with the group, and a plain one with a bare
 * order. Everything post-purchase the customer sees describes the checkout, not
 * one of its parts, so both shapes are normalized here into the same view and
 * the UI never branches on which came back.
 */

import type {
  Address,
  Fulfillment,
  LineItem,
  Order,
  OrderGroup,
  Payment,
} from "@spree/sdk";
import { isOrderGroup } from "@spree/sdk";

/** What a completed checkout comes back as. */
export type CompletedPurchase = Order | OrderGroup;

/**
 * The money lines the summary renders, as the amounts the API reports — the
 * reader's own formatting is applied where they are shown. An order carries
 * every one of them; a group carries only the roll-ups it is serialized with,
 * so the rest are summed from its children — never prorated, since the
 * children are the record.
 */
export interface PurchaseTotals {
  currency: string;
  item_total: string | null;
  delivery_total: string | null;
  discount_total: string | null;
  tax_total: string | null;
  total: string | null;
  gift_card_total: string | null;
  store_credit_total: string | null;
  amount_due: string | null;
}

/**
 * One order inside the checkout — a single-seller checkout has exactly one,
 * a split checkout one per seller, each with its own items, delivery and total.
 */
export interface PurchaseSegment {
  id: string;
  number: string;
  items: LineItem[];
  fulfillments: Fulfillment[];
  total: string | null;
}

export interface Purchase {
  /** The number the customer was given — the group's when the checkout split. */
  number: string;
  email: string | null;
  currency: string;
  billing_address: Address | null;
  shipping_address: Address | null;
  payments: Payment[];
  /** Every item bought, across every order the checkout produced. */
  items: LineItem[];
  /** Every delivery, likewise. */
  fulfillments: Fulfillment[];
  segments: PurchaseSegment[];
  /** True when the checkout produced more than one order. */
  split: boolean;
  totals: PurchaseTotals;
}

function toSegment(order: Order): PurchaseSegment {
  return {
    id: order.id,
    number: order.number,
    items: order.items ?? [],
    fulfillments: order.fulfillments ?? [],
    total: order.total,
  };
}

function toAmount(value: string | null | undefined): number {
  const amount = Number.parseFloat(value ?? "");
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * What a group carries on a backend new enough to serialize it, and the
 * installed `@spree/sdk` does not describe yet: the payment the checkout was
 * charged, and the money lines rolled up from the children.
 *
 * Optional throughout, because the storefront has to render against both — a
 * backend that answers them, and one that leaves them to be worked out here.
 * Drop this once the published SDK types carry them.
 */
type ServedGroupTotals = Partial<PurchaseTotals> & {
  payments?: Payment[];
};

/**
 * Builds the view of a checkout the summary page renders.
 *
 * @param result what completion (or a later lookup) answered with
 */
export function toPurchase(result: CompletedPurchase): Purchase {
  if (!isOrderGroup(result)) {
    return {
      number: result.number,
      email: result.email,
      currency: result.currency,
      billing_address: result.billing_address,
      shipping_address: result.shipping_address,
      payments: result.payments ?? [],
      items: result.items ?? [],
      fulfillments: result.fulfillments ?? [],
      segments: [toSegment(result)],
      split: false,
      totals: result,
    };
  }

  const orders = result.orders ?? [];
  const served = result as OrderGroup & ServedGroupTotals;

  // Every figure the group reports is preferred over one worked out here: the
  // backend rolls them up from the same children, in the currency's own
  // rounding. The sums are the fallback for a backend that leaves them off,
  // and they agree because the inputs are the same rows.
  const rolledUp = (
    served: string | null | undefined,
    children: (order: Order) => string | null,
  ): string =>
    served ??
    orders
      .reduce((running, order) => running + toAmount(children(order)), 0)
      .toString();

  return {
    number: result.number,
    email: result.email,
    currency: result.currency,
    billing_address: result.billing_address,
    shipping_address: result.shipping_address,
    // The payment is made once, against the group — a child serializes an
    // empty list because the row no longer hangs off it. A backend that does
    // not serialize the group's own leaves nothing to show, which is better
    // than showing one seller's share as the whole charge.
    payments: served.payments ?? [],
    items: orders.flatMap((order) => order.items ?? []),
    fulfillments: orders.flatMap((order) => order.fulfillments ?? []),
    segments: orders.map(toSegment),
    split: orders.length > 1,
    totals: {
      currency: result.currency,
      item_total: result.item_total,
      delivery_total: rolledUp(served.delivery_total, (o) => o.delivery_total),
      discount_total: rolledUp(served.discount_total, (o) => o.discount_total),
      tax_total: rolledUp(served.tax_total, (o) => o.tax_total),
      total: result.total,
      gift_card_total: rolledUp(
        served.gift_card_total,
        (o) => o.gift_card_total,
      ),
      store_credit_total: rolledUp(
        served.store_credit_total,
        (o) => o.store_credit_total,
      ),
      amount_due: rolledUp(served.amount_due, (o) => o.amount_due),
    },
  };
}
