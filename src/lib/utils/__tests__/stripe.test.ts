import { describe, expect, it, vi } from "vitest";

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn((key: string) => Promise.resolve({ key })),
}));

describe("stripe", () => {
  it("prefers the key the payment method carries", async () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_env");
    vi.resetModules();
    const { stripePublishableKey } = await import("../stripe");

    expect(
      stripePublishableKey({
        type: "stripe",
        public_preferences: { publishable_key: "pk_eu" },
      }),
    ).toBe("pk_eu");
    expect(
      stripePublishableKey({ type: "stripe", public_preferences: {} }),
    ).toBe("pk_env");
  });

  it("finds the cart's Stripe method among others", async () => {
    const { findStripeMethod } = await import("../stripe");

    expect(
      findStripeMethod([
        { type: "check" },
        { type: "stripe", public_preferences: { publishable_key: "pk_us" } },
      ])?.public_preferences,
    ).toEqual({ publishable_key: "pk_us" });
  });

  it("loads Stripe once per account", async () => {
    const { getStripe } = await import("../stripe");

    expect(getStripe("pk_eu")).toBe(getStripe("pk_eu"));
    expect(getStripe("pk_eu")).not.toBe(getStripe("pk_us"));
    await expect(getStripe(undefined)).resolves.toBeNull();
  });
});
