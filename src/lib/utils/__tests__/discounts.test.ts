import { describe, expect, it } from "vitest";
import { totalDiscount } from "@/lib/utils/discounts";

// Spree 6 counts only promotions in `discount_total`. A discount written
// another way (spree-bank_payments' bank transfer discount is a `manual`
// one) is only in `adjustment_total`, which also holds fees and added tax.
function totals(overrides: Record<string, string | null> = {}) {
  return {
    adjustment_total: "0.00",
    discount_total: "0.00",
    fee_total: "0.00",
    additional_tax_total: "0.00",
    ...overrides,
  };
}

describe("totalDiscount", () => {
  it("counts a discount Spree leaves out of discount_total", () => {
    expect(totalDiscount(totals({ adjustment_total: "-1.20" }))).toBe("-1.20");
  });

  it("adds it to the promotions", () => {
    expect(
      totalDiscount(
        totals({ adjustment_total: "-21.20", discount_total: "-20.00" }),
      ),
    ).toBe("-21.20");
  });

  it("leaves out fees and added tax", () => {
    expect(
      totalDiscount(
        totals({
          adjustment_total: "4.80",
          fee_total: "2.00",
          additional_tax_total: "4.00",
        }),
      ),
    ).toBe("-1.20");
  });

  it("is null when nothing is off", () => {
    expect(totalDiscount(totals())).toBeNull();
  });

  it("falls back to the promotions without an adjustment total", () => {
    expect(
      totalDiscount(
        totals({ adjustment_total: null, discount_total: "-5.00" }),
      ),
    ).toBe("-5.00");
  });
});
