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
 * One order inside the checkout — a single-seller checkout has exactly one,
 * a split checkout one per seller, each with its own items and delivery.
 */
export interface PurchaseSegment {
  id: string;
  number: string;
  items: LineItem[];
  fulfillments: Fulfillment[];
}

export interface Purchase {
  /** The number the customer was given — the group's when the checkout split. */
  number: string;
  email: string | null;
  currency: string;
  billing_address: Address | null;
  shipping_address: Address | null;
  payments: Payment[];
  /** Every delivery, across every order the checkout produced. */
  fulfillments: Fulfillment[];
  segments: PurchaseSegment[];
  /** True when the checkout produced more than one order. */
  split: boolean;
  /**
   * The money lines the summary renders. A group carries its own roll-ups of
   * its children — and the payment-side figures (gift card, store credit,
   * amount due) only exist on the group, since the payment is made against it.
   */
  totals: CompletedPurchase;
}

function toSegment(order: Order): PurchaseSegment {
  return {
    id: order.id,
    number: order.number,
    items: order.items ?? [],
    fulfillments: order.fulfillments ?? [],
  };
}

/**
 * Builds the view of a checkout the summary page renders.
 *
 * @param result what completion (or a later lookup) answered with
 */
export function toPurchase(result: CompletedPurchase): Purchase {
  const orders = isOrderGroup(result) ? (result.orders ?? []) : [result];
  const segments = orders.map(toSegment);

  return {
    number: result.number,
    email: result.email,
    currency: result.currency,
    billing_address: result.billing_address,
    shipping_address: result.shipping_address,
    // The payment is made once, against the group — a child serializes an
    // empty list, so the group's own is the only one to show.
    payments: result.payments ?? [],
    fulfillments: segments.flatMap((segment) => segment.fulfillments),
    segments,
    split: segments.length > 1,
    totals: result,
  };
}
