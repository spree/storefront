import type { Cart, Fulfillment } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import {
  buildShippingRateMap,
  hasPayableTotal,
} from "@/lib/utils/express-checkout";

// Only the money fields hasPayableTotal reads; cast keeps the fixture minimal.
const cart = (total: string | null, itemTotal: string | null = null): Cart =>
  ({ total, item_total: itemTotal }) as unknown as Cart;

describe("hasPayableTotal", () => {
  it("is true for a positive total", () => {
    expect(hasPayableTotal(cart("19.99"))).toBe(true);
  });

  it("falls back to item_total when total is null", () => {
    expect(hasPayableTotal(cart(null, "5.00"))).toBe(true);
  });

  it("is false when both total and item_total are null (prices hidden)", () => {
    expect(hasPayableTotal(cart(null, null))).toBe(false);
  });

  it("is false for a zero total", () => {
    expect(hasPayableTotal(cart("0.00"))).toBe(false);
  });

  it("is false for a non-numeric total", () => {
    expect(hasPayableTotal(cart("abc"))).toBe(false);
  });
});

describe("buildShippingRateMap", () => {
  const rate = (id: string, methodId: string, cost: string | null) => ({
    id,
    delivery_method_id: methodId,
    name: `Method ${methodId}`,
    cost,
  });
  const fulfillment = (id: string, rates: ReturnType<typeof rate>[]) =>
    ({ id, delivery_rates: rates }) as unknown as Fulfillment;

  it("leaves out a delivery method that has a rate without a price", () => {
    const { shippingRates, selectionMap } = buildShippingRateMap(
      [
        fulfillment("ful_1", [
          rate("r1", "dm_1", "5.00"),
          rate("r2", "dm_2", "9.00"),
        ]),
        fulfillment("ful_2", [
          rate("r3", "dm_1", "2.50"),
          rate("r4", "dm_2", null),
        ]),
      ],
      false,
      "USD",
    );

    expect(shippingRates).toEqual([
      { id: "dm_1", displayName: "Method dm_1", amount: 750 },
    ]);
    expect([...selectionMap.keys()]).toEqual(["dm_1"]);
  });
});
