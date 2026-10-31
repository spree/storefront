import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const providerOptions = vi.fn();
vi.mock("@paypal/react-paypal-js", () => ({
  PayPalScriptProvider: ({
    options,
    children,
  }: {
    options: Record<string, unknown>;
    children: ReactNode;
  }) => {
    providerOptions(options);
    return <div>{children}</div>;
  },
  PayPalButtons: ({ fundingSource }: { fundingSource: string }) => (
    <button type="button" data-testid="paypal-button">
      {fundingSource}
    </button>
  ),
}));

import { PayPalPaymentForm } from "@/components/checkout/PayPalPaymentForm";

describe("PayPalPaymentForm", () => {
  it("loads the SDK for Pay Later and Venmo and renders one button per allowed source", async () => {
    render(
      <PayPalPaymentForm
        paypalOrderId="5O190127TN364715T"
        clientId="client-id"
        intent="AUTHORIZE"
        currency="usd"
        onReady={vi.fn()}
        onApproved={vi.fn()}
      />,
    );

    const buttons = await screen.findAllByTestId("paypal-button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "paypal",
      "paylater",
      "venmo",
      "card",
    ]);
    expect(providerOptions).toHaveBeenLastCalledWith({
      clientId: "client-id",
      currency: "USD",
      intent: "authorize",
      enableFunding: ["paylater", "venmo"],
    });
  });
});
