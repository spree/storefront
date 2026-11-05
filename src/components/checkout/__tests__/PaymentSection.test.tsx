import type { Cart, CreditCard, PaymentMethod } from "@spree/sdk";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/checkout/StripePaymentForm", () => ({
  StripePaymentForm: ({ clientSecret }: { clientSecret: string }) => (
    <div data-testid="stripe-form">{clientSecret}</div>
  ),
  confirmWithSavedCard: vi.fn(),
}));

vi.mock("@/components/checkout/AdyenPaymentForm", () => ({
  AdyenPaymentForm: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="adyen-form">{sessionId}</div>
  ),
}));

vi.mock("@/components/checkout/PayPalPaymentForm", () => ({
  PayPalPaymentForm: () => null,
}));

vi.mock("@/components/checkout/AddressFormFields", () => ({
  AddressFormFields: () => null,
}));

const getCreditCards = vi.fn();
vi.mock("@/lib/data/credit-cards", () => ({
  getCreditCards: () => getCreditCards(),
}));

const createCheckoutPaymentSession = vi.fn();
vi.mock("@/lib/data/payment", () => ({
  createCheckoutPaymentSession: (...args: unknown[]) =>
    createCheckoutPaymentSession(...args),
  createDirectPayment: vi.fn(),
  getCheckoutPaymentSession: vi.fn(),
  updateCheckoutPaymentSession: vi.fn(),
}));

import { PaymentSection } from "@/components/checkout/PaymentSection";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const directMethod = {
  id: "pm_check",
  name: "Check",
  type: "check",
  session_required: false,
} as unknown as PaymentMethod;
const stripeMethod = {
  id: "pm_stripe",
  name: "Stripe",
  type: "stripe",
  session_required: true,
} as unknown as PaymentMethod;
const adyenMethod = {
  id: "pm_adyen",
  name: "Adyen",
  type: "adyen",
  session_required: true,
} as unknown as PaymentMethod;

const cart = {
  id: "cart_1",
  total: "10.00",
  amount_due: "10.00",
  currency: "USD",
  payment_methods: [directMethod, stripeMethod, adyenMethod],
  shipping_address: null,
  billing_address: null,
  shipping_eq_billing_address: true,
} as unknown as Cart;

const savedCard = {
  id: "card_1",
  default: true,
  gateway_payment_profile_id: "pm_saved_card",
} as unknown as CreditCard;

function renderSection() {
  return render(
    <PaymentSection
      cart={cart}
      countries={[]}
      isAuthenticated
      fetchStates={vi.fn().mockResolvedValue([])}
      onUpdateBillingAddress={vi.fn().mockResolvedValue(true)}
      onPaymentComplete={vi.fn().mockResolvedValue(true)}
      processing={false}
      setProcessing={vi.fn()}
    />,
  );
}

describe("PaymentSection", () => {
  beforeEach(() => {
    getCreditCards.mockReset();
    createCheckoutPaymentSession.mockReset();
  });

  it("keeps the Adyen session when a slow Stripe saved-card load resolves after switching to Adyen", async () => {
    const cards = deferred<{ data: CreditCard[] }>();
    getCreditCards.mockReturnValue(cards.promise);
    createCheckoutPaymentSession.mockImplementation(
      async (_cartId: string, methodId: string) =>
        methodId === adyenMethod.id
          ? {
              success: true,
              session: {
                id: "ps_adyen",
                external_id: "adyen_session",
                external_data: { session_data: "adyen_data" },
              },
            }
          : {
              success: true,
              session: {
                id: "ps_stripe",
                external_id: "pi_1",
                external_data: { client_secret: "stripe_secret" },
              },
            },
    );

    renderSection();

    // Direct method → Stripe: saved cards start loading.
    fireEvent.click(screen.getByRole("radio", { name: "Stripe" }));
    // Stripe → Adyen while cards are still loading.
    fireEvent.click(screen.getByRole("radio", { name: "Adyen" }));

    expect(await screen.findByTestId("adyen-form")).toHaveTextContent(
      "adyen_session",
    );

    // The delayed Stripe init must not create a session or replace Adyen's.
    await act(async () => {
      cards.resolve({ data: [savedCard] });
    });

    expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(1);
    expect(createCheckoutPaymentSession).toHaveBeenCalledWith(
      cart.id,
      adyenMethod.id,
      expect.any(Object),
    );
    expect(screen.getByTestId("adyen-form")).toHaveTextContent("adyen_session");
  });
});
