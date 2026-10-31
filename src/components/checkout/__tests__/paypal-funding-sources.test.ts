import { describe, expect, it } from "vitest";
import {
  PAYPAL_ENABLE_FUNDING,
  PAYPAL_FUNDING_SOURCES,
} from "@/components/checkout/PayPalPaymentForm";

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

  // Without it PayPal hides Pay Later outside the US, and Venmo everywhere.
  it("asks PayPal for Pay Later and Venmo, both of them offered buttons", () => {
    expect(PAYPAL_ENABLE_FUNDING).toEqual(["paylater", "venmo"]);
    for (const source of PAYPAL_ENABLE_FUNDING) {
      expect(PAYPAL_FUNDING_SOURCES).toContain(source);
    }
  });
});
