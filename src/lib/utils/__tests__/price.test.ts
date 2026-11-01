import { describe, expect, it } from "vitest";
import { lineItemAmount } from "../price";

describe("lineItemAmount", () => {
  it("multiplies price by quantity, ignoring tax and discounts", () => {
    expect(lineItemAmount({ price: "19.99", quantity: 3 })).toBe("59.97");
  });

  it("keeps extra decimals for display rounding", () => {
    expect(lineItemAmount({ price: "19.9990", quantity: 3 })).toBe("59.9970");
  });

  it("is null when the price is hidden", () => {
    expect(lineItemAmount({ price: null, quantity: 2 })).toBeNull();
  });
});
