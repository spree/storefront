import type { Cart } from "@spree/sdk";
import { render } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";

const mountedKeys: string[] = [];

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ stripe, children }: { stripe: string; children: ReactNode }) => {
    useState(() => mountedKeys.push(stripe));
    return children;
  },
  ExpressCheckoutElement: () => null,
  useElements: () => null,
  useStripe: () => null,
}));

vi.mock("@/lib/utils/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils/stripe")>()),
  getStripe: (key: string) => key,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/lib/data/express-checkout-flow", () => ({}));

import { ExpressCheckoutButton } from "@/components/checkout/ExpressCheckoutButton";

function cartWith(publishableKey: string, total: string) {
  return {
    id: "cart_1",
    currency: "USD",
    total,
    item_total: total,
    items: [],
    payment_methods: [
      {
        id: `pm_${publishableKey}`,
        type: "stripe",
        public_preferences: { publishable_key: publishableKey },
      },
    ],
  } as unknown as Cart;
}

describe("ExpressCheckoutButton", () => {
  it("remounts Stripe Elements for another account, not for a new amount", () => {
    mountedKeys.length = 0;
    const props = { basePath: "/us/en", onComplete: vi.fn() };
    const { rerender } = render(
      <ExpressCheckoutButton cart={cartWith("pk_eu", "10.00")} {...props} />,
    );

    rerender(
      <ExpressCheckoutButton cart={cartWith("pk_eu", "25.00")} {...props} />,
    );
    expect(mountedKeys).toEqual(["pk_eu"]);

    rerender(
      <ExpressCheckoutButton cart={cartWith("pk_us", "25.00")} {...props} />,
    );
    expect(mountedKeys).toEqual(["pk_eu", "pk_us"]);
  });
});
