import { describe, expect, it } from "vitest";
import { PAYPAL_FUNDING_SOURCES } from "@/components/checkout/PayPalPaymentForm";

describe("PAYPAL_FUNDING_SOURCES", () => {
  // Any other button can send the buyer to their bank, which needs the PayPal
  // gateway to act on the approval webhook first.
  it("offers exactly PayPal, Pay Later, Venmo and card", () => {
    expect(PAYPAL_FUNDING_SOURCES).toEqual([
      "paypal",
      "paylater",
      "venmo",
      "card",
    ]);
  });
});
