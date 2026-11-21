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

const adyenForm: {
  onBeforeSubmit?: () => Promise<string>;
  onFailed?: (reason: "invalid" | "ended") => void;
} = {};
vi.mock("@/components/checkout/AdyenPaymentForm", () => ({
  AdyenPaymentForm: ({
    sessionId,
    onBeforeSubmit,
    onFailed,
  }: {
    sessionId: string;
    onBeforeSubmit: () => Promise<string>;
    onFailed: (reason: "invalid" | "ended") => void;
  }) => {
    adyenForm.onBeforeSubmit = onBeforeSubmit;
    adyenForm.onFailed = onFailed;
    return <div data-testid="adyen-form">{sessionId}</div>;
  },
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
const updateCheckoutPaymentSession = vi.fn();
const getCheckoutPaymentSession = vi.fn();
vi.mock("@/lib/data/payment", () => ({
  createCheckoutPaymentSession: (...args: unknown[]) =>
    createCheckoutPaymentSession(...args),
  createDirectPayment: vi.fn(),
  getCheckoutPaymentSession: (...args: unknown[]) =>
    getCheckoutPaymentSession(...args),
  updateCheckoutPaymentSession: (...args: unknown[]) =>
    updateCheckoutPaymentSession(...args),
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
  brand: "visa",
  last_digits: "4242",
  month: 12,
  year: 2030,
} as unknown as CreditCard;

function section(currentCart: Cart = cart, setProcessing = vi.fn()) {
  return (
    <PaymentSection
      cart={currentCart}
      countries={[]}
      isAuthenticated
      fetchStates={vi.fn().mockResolvedValue([])}
      onUpdateBillingAddress={vi.fn().mockResolvedValue(true)}
      onPaymentComplete={vi.fn().mockResolvedValue(true)}
      processing={false}
      setProcessing={setProcessing}
    />
  );
}

function renderSection() {
  return render(section());
}

const stripeSession = {
  success: true,
  session: {
    id: "ps_stripe",
    external_id: "pi_1",
    external_data: { client_secret: "stripe_secret" },
  },
};
const adyenSession = {
  success: true,
  session: {
    id: "ps_adyen",
    external_id: "adyen_session",
    external_data: { session_data: "adyen_data" },
  },
};

describe("PaymentSection", () => {
  beforeEach(() => {
    getCreditCards.mockReset();
    createCheckoutPaymentSession.mockReset();
    updateCheckoutPaymentSession.mockReset();
    getCheckoutPaymentSession.mockReset();
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

  it("keeps the Adyen session when a Stripe total update resolves after switching to Adyen", async () => {
    getCreditCards.mockResolvedValue({ data: [] });
    createCheckoutPaymentSession.mockImplementation(
      async (_cartId: string, methodId: string) =>
        methodId === adyenMethod.id ? adyenSession : stripeSession,
    );
    const update = deferred<typeof stripeSession>();
    updateCheckoutPaymentSession.mockReturnValue(update.promise);

    const { rerender } = renderSection();

    fireEvent.click(screen.getByRole("radio", { name: "Stripe" }));
    expect(await screen.findByTestId("stripe-form")).toHaveTextContent(
      "stripe_secret",
    );

    // Cart total changes: the Stripe session is updated in place.
    rerender(section({ ...cart, total: "12.00", amount_due: "12.00" } as Cart));
    expect(updateCheckoutPaymentSession).toHaveBeenCalledWith(
      cart.id,
      "ps_stripe",
      { amount: "12.00" },
    );

    // Switch to Adyen before the Stripe update resolves.
    fireEvent.click(screen.getByRole("radio", { name: "Adyen" }));
    expect(await screen.findByTestId("adyen-form")).toHaveTextContent(
      "adyen_session",
    );

    await act(async () => {
      update.resolve({
        ...stripeSession,
        session: {
          ...stripeSession.session,
          external_data: { client_secret: "stripe_secret_2" },
        },
      });
    });

    expect(screen.getByTestId("adyen-form")).toHaveTextContent("adyen_session");
  });

  describe("an Adyen attempt that ends without a payment", () => {
    async function endAttempt(reason: "invalid" | "ended", status?: string) {
      getCreditCards.mockResolvedValue({ data: [] });
      createCheckoutPaymentSession.mockResolvedValue(adyenSession);
      getCheckoutPaymentSession.mockResolvedValue({
        success: true,
        session: { ...adyenSession.session, status },
      });
      const setProcessing = vi.fn();

      render(section(cart, setProcessing));
      fireEvent.click(screen.getByRole("radio", { name: "Adyen" }));
      await screen.findByTestId("adyen-form");

      await act(async () => adyenForm.onFailed?.(reason));
      return setProcessing;
    }

    it("releases Pay Now after invalid fields, without reading the session", async () => {
      const setProcessing = await endAttempt("invalid");

      expect(setProcessing).toHaveBeenLastCalledWith(false);
      expect(getCheckoutPaymentSession).not.toHaveBeenCalled();
    });

    it("opens a new session when the ended one can no longer be paid", async () => {
      const setProcessing = await endAttempt("ended", "expired");

      expect(setProcessing).toHaveBeenCalledWith(false);
      expect(getCheckoutPaymentSession).toHaveBeenCalledWith(
        cart.id,
        "ps_adyen",
      );
      expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(2);
    });

    it("keeps a session that can still be paid", async () => {
      await endAttempt("ended", "pending");

      expect(getCheckoutPaymentSession).toHaveBeenCalled();
      expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(1);
    });
  });

  describe("an Adyen submit during an amount update", () => {
    async function submitDuringUpdate(outcome: {
      success: boolean;
      session?: unknown;
    }) {
      getCreditCards.mockResolvedValue({ data: [] });
      createCheckoutPaymentSession.mockResolvedValue(adyenSession);
      const amountUpdate = deferred<typeof outcome>();
      updateCheckoutPaymentSession.mockImplementation(
        async (_cartId: string, _sessionId: string, params: object) =>
          "amount" in params
            ? amountUpdate.promise
            : {
                success: true,
                session: {
                  ...adyenSession.session,
                  external_data: { session_data: "payable_data" },
                },
              },
      );

      const { rerender } = renderSection();
      fireEvent.click(screen.getByRole("radio", { name: "Adyen" }));
      await screen.findByTestId("adyen-form");
      rerender(
        section({ ...cart, total: "12.00", amount_due: "12.00" } as Cart),
      );

      const submitted = adyenForm.onBeforeSubmit?.();
      submitted?.catch(() => undefined);
      // The submit waits: nothing is made payable before the update answers.
      await act(async () => {});
      expect(updateCheckoutPaymentSession).not.toHaveBeenCalledWith(
        cart.id,
        "ps_adyen",
        { external_data: { submit: true } },
      );

      await act(async () => {
        amountUpdate.resolve(outcome);
      });
      return submitted;
    }

    it("makes the session payable once the new amount is held", async () => {
      await expect(submitDuringUpdate(adyenSession)).resolves.toBe(
        "payable_data",
      );
      expect(updateCheckoutPaymentSession).toHaveBeenCalledWith(
        cart.id,
        "ps_adyen",
        { external_data: { submit: true } },
      );
    });

    it("waits for an amount update started after it and refuses if that one failed", async () => {
      getCreditCards.mockResolvedValue({ data: [] });
      createCheckoutPaymentSession.mockResolvedValue(adyenSession);
      const updates: Record<string, ReturnType<typeof deferred<unknown>>> = {
        "12.00": deferred(),
        "14.00": deferred(),
      };
      updateCheckoutPaymentSession.mockImplementation(
        async (_cartId: string, _sessionId: string, params: object) =>
          "amount" in params
            ? updates[(params as { amount: string }).amount].promise
            : adyenSession,
      );

      const { rerender } = renderSection();
      fireEvent.click(screen.getByRole("radio", { name: "Adyen" }));
      await screen.findByTestId("adyen-form");
      rerender(
        section({ ...cart, total: "12.00", amount_due: "12.00" } as Cart),
      );
      const submitted = adyenForm.onBeforeSubmit?.();
      submitted?.catch(() => undefined);
      rerender(
        section({ ...cart, total: "14.00", amount_due: "14.00" } as Cart),
      );

      await act(async () => {
        updates["12.00"].resolve(adyenSession);
      });
      expect(updateCheckoutPaymentSession).not.toHaveBeenCalledWith(
        cart.id,
        "ps_adyen",
        { external_data: { submit: true } },
      );

      await act(async () => {
        updates["14.00"].resolve({ success: false });
      });
      await expect(submitted).rejects.toThrow("failedToInitPayment");
      expect(updateCheckoutPaymentSession).not.toHaveBeenCalledWith(
        cart.id,
        "ps_adyen",
        { external_data: { submit: true } },
      );
    });

    it("refuses to pay when the amount update failed", async () => {
      await expect(submitDuringUpdate({ success: false })).rejects.toThrow(
        "failedToInitPayment",
      );
      expect(updateCheckoutPaymentSession).not.toHaveBeenCalledWith(
        cart.id,
        "ps_adyen",
        { external_data: { submit: true } },
      );
    });
  });

  it("keeps the saved default card when the cart total changes while cards load", async () => {
    const cards = deferred<{ data: CreditCard[] }>();
    getCreditCards.mockReturnValue(cards.promise);
    createCheckoutPaymentSession.mockResolvedValue(stripeSession);
    updateCheckoutPaymentSession.mockResolvedValue(stripeSession);

    const { rerender } = renderSection();
    fireEvent.click(screen.getByRole("radio", { name: "Stripe" }));

    // Shipping update lands while saved cards are still loading.
    const updatedCart = {
      ...cart,
      total: "12.00",
      amount_due: "12.00",
    } as Cart;
    rerender(section(updatedCart));

    await act(async () => {
      cards.resolve({ data: [savedCard] });
    });

    expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(1);
    expect(createCheckoutPaymentSession).toHaveBeenCalledWith(
      cart.id,
      stripeMethod.id,
      expect.objectContaining({ stripe_payment_method_id: "pm_saved_card" }),
    );
    // The new total is synced into the session once it exists.
    expect(updateCheckoutPaymentSession).toHaveBeenCalledWith(
      cart.id,
      "ps_stripe",
      { amount: "12.00" },
    );
  });
});
