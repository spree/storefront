import type { Cart } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import { cartShippingDisplay } from "./shipping-display";

function cart(partial: Partial<Cart>): Cart {
  return {
    id: "cart_test",
    fulfillments: [],
    delivery_total: "0",
    display_delivery_total: "$0.00",
    ...partial,
  } as Cart;
}

describe("cartShippingDisplay", () => {
  it("does not treat a zero delivery total as free before shipping is quoted", () => {
    const result = cartShippingDisplay(
      cart({ delivery_total: "0", display_delivery_total: "$0.00" }),
    );
    expect(result.hasQuotedShipping).toBe(false);
    expect(result.shippingFree).toBe(false);
    expect(result.shippingAmount).toBeNull();
  });

  it("shows free shipping when quoted delivery is zero", () => {
    const result = cartShippingDisplay(
      cart({
        fulfillments: [{ id: "ful_1" } as Cart["fulfillments"][number]],
        delivery_total: "0",
        display_delivery_total: "$0.00",
      }),
    );
    expect(result.shippingFree).toBe(true);
    expect(result.shippingAmount).toBeNull();
  });

  it("shows a positive quoted amount", () => {
    const result = cartShippingDisplay(
      cart({
        fulfillments: [{ id: "ful_1" } as Cart["fulfillments"][number]],
        delivery_total: "12.5",
        display_delivery_total: "$12.50",
      }),
    );
    expect(result.shippingFree).toBe(false);
    expect(result.shippingAmount).toBe("$12.50");
  });
});
