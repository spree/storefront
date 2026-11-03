/**
 * What a customer can send back from an order, read from the order itself.
 *
 * The API says, per shipped unit, how much may still come back and why not
 * when nothing can (`returnable_quantity`, `non_returnable_reason`), and per
 * order whether returns are open at all (`returns_eligibility`). Nothing here
 * restates a rule — the store's own validators produced those answers.
 */

import type { LineItem, Order } from "@spree/sdk";

type FulfillmentItemRow = NonNullable<
  Order["fulfillments"]
>[number]["items"][number];
export type ReturnUnit = NonNullable<FulfillmentItemRow["units"]>[number];

/** One line of one parcel, as the customer picks from it. */
export interface ReturnableRow {
  /** Stable key: parcel and line together. */
  key: string;
  lineItem: LineItem;
  fulfillmentNumber: string;
  units: ReturnUnit[];
  returnableQuantity: number;
  nonReturnableReason: string | null;
}

/** Every shipped line on the order, returnable or not, parcel by parcel. */
export function returnableRows(order: Order): ReturnableRow[] {
  const lineItems = new Map((order.items ?? []).map((item) => [item.id, item]));

  return (order.fulfillments ?? []).flatMap((fulfillment) =>
    (fulfillment.items ?? []).flatMap((row) => {
      const lineItem = lineItems.get(row.item_id);
      if (!lineItem) return [];

      return [
        {
          key: `${fulfillment.id}:${row.item_id}`,
          lineItem,
          fulfillmentNumber: fulfillment.number,
          units: row.units ?? [],
          returnableQuantity: row.returnable_quantity ?? 0,
          nonReturnableReason: row.non_returnable_reason ?? null,
        },
      ];
    }),
  );
}

/** Whether the order offers the customer anything to send back now. */
export function canRequestReturn(order: Order): boolean {
  return (
    Boolean(order.returns_eligibility?.eligible) &&
    returnableRows(order).some((row) => row.returnableQuantity > 0)
  );
}

/**
 * Spreads a quantity over a line's shipped units, filling each up to what it
 * still allows. A line almost always rides as one unit; the split exists for
 * the rare parcel that packed one line as two.
 */
export function allocateUnits(
  units: ReturnUnit[],
  quantity: number,
): Array<{ fulfillment_item_id: string; quantity: number }> {
  const allocated: Array<{ fulfillment_item_id: string; quantity: number }> =
    [];
  let remaining = quantity;

  for (const unit of units) {
    if (remaining <= 0) break;
    const take = Math.min(unit.returnable_quantity, remaining);
    if (take <= 0) continue;
    allocated.push({
      fulfillment_item_id: unit.fulfillment_item_id,
      quantity: take,
    });
    remaining -= take;
  }

  return allocated;
}
