import type { Order } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import { allocateUnits, canRequestReturn, returnableRows } from "../returns";

const unit = (
  id: string,
  returnable: number,
  reason: string | null = null,
) => ({
  fulfillment_item_id: id,
  quantity: 2,
  returnable_quantity: returnable,
  non_returnable_reason: reason,
});

function order(overrides: Partial<Order> = {}): Order {
  return {
    items: [{ id: "li_1", name: "Shirt" }],
    fulfillments: [
      {
        id: "ful_1",
        number: "H1",
        items: [
          {
            item_id: "li_1",
            variant_id: "variant_1",
            quantity: 2,
            returnable_quantity: 2,
            non_returnable_reason: null,
            units: [unit("fi_1", 2)],
          },
        ],
      },
    ],
    returns_eligibility: {
      eligible: true,
      errors: [],
      return_window_ends_at: null,
      withdrawal_period_ends_at: null,
    },
    ...overrides,
  } as unknown as Order;
}

describe("returnableRows", () => {
  it("pairs each parcel line with its line item and what may come back", () => {
    const [row] = returnableRows(order());

    expect(row.key).toBe("ful_1:li_1");
    expect(row.lineItem.name).toBe("Shirt");
    expect(row.returnableQuantity).toBe(2);
  });

  it("skips a parcel line whose line item is gone", () => {
    expect(returnableRows(order({ items: [] }))).toEqual([]);
  });
});

describe("canRequestReturn", () => {
  it("is open while the order is eligible and something can come back", () => {
    expect(canRequestReturn(order())).toBe(true);
  });

  it("is closed when the store's rules say so", () => {
    const closed = order({
      returns_eligibility: {
        eligible: false,
        errors: [{ code: "outside_return_window", message: "Too late" }],
        return_window_ends_at: null,
        withdrawal_period_ends_at: null,
      },
    });

    expect(canRequestReturn(closed)).toBe(false);
  });
});

describe("allocateUnits", () => {
  it("fills units in turn up to what each still allows", () => {
    expect(allocateUnits([unit("fi_1", 1), unit("fi_2", 2)], 2)).toEqual([
      { fulfillment_item_id: "fi_1", quantity: 1 },
      { fulfillment_item_id: "fi_2", quantity: 1 },
    ]);
  });

  it("skips a unit with nothing left", () => {
    expect(
      allocateUnits([unit("fi_1", 0, "already_returned"), unit("fi_2", 2)], 1),
    ).toEqual([{ fulfillment_item_id: "fi_2", quantity: 1 }]);
  });
});
