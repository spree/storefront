import type { Cart, CreditCard, PaymentMethod } from "@spree/sdk";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef, type Ref } from "react";
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

const paypalForm: {
  onOpen?: () => void;
  onApproved?: () => Promise<string>;
} = {};
vi.mock("@/components/checkout/PayPalPaymentForm", () => ({
  PayPalPaymentForm: ({
    paypalOrderId,
    onOpen,
    onApproved,
  }: {
    paypalOrderId: string;
    onOpen?: () => void;
    onApproved: () => Promise<string>;
  }) => {
    paypalForm.onOpen = onOpen;
    paypalForm.onApproved = onApproved;
    return <div data-testid="paypal-form">{paypalOrderId}</div>;
  },
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
const createDirectPayment = vi.fn();
vi.mock("@/lib/data/payment", () => ({
  createCheckoutPaymentSession: (...args: unknown[]) =>
    createCheckoutPaymentSession(...args),
  createDirectPayment: (...args: unknown[]) => createDirectPayment(...args),
  getCheckoutPaymentSession: (...args: unknown[]) =>
    getCheckoutPaymentSession(...args),
  updateCheckoutPaymentSession: (...args: unknown[]) =>
    updateCheckoutPaymentSession(...args),
}));

import {
  PaymentSection,
  type PaymentSectionHandle,
} from "@/components/checkout/PaymentSection";
import { confirmWithSavedCard } from "@/components/checkout/StripePaymentForm";

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
const paypalMethod = {
  id: "pm_paypal",
  name: "PayPal",
  type: "paypal",
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
  payment_methods: [directMethod, stripeMethod, adyenMethod, paypalMethod],
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

function section(
  currentCart: Cart = cart,
  setProcessing = vi.fn(),
  handlers: {
    onUpdateBillingAddress?: () => Promise<Cart | null>;
    onPaymentComplete?: () => Promise<boolean>;
    ref?: Ref<PaymentSectionHandle>;
  } = {},
) {
  return (
    <PaymentSection
      ref={handlers.ref}
      cart={currentCart}
      countries={[]}
      isAuthenticated
      fetchStates={vi.fn().mockResolvedValue([])}
      onUpdateBillingAddress={
        handlers.onUpdateBillingAddress ??
        vi.fn().mockResolvedValue(currentCart)
      }
      onPaymentComplete={
        handlers.onPaymentComplete ?? vi.fn().mockResolvedValue(true)
      }
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

  it("opens a session for the method shown when the chosen one leaves the list", async () => {
    getCreditCards.mockResolvedValue({ data: [] });
    createCheckoutPaymentSession.mockImplementation(
      async (_cartId: string, methodId: string) =>
        methodId === adyenMethod.id ? adyenSession : stripeSession,
    );

    const { rerender } = renderSection();
    fireEvent.click(screen.getByRole("radio", { name: "Adyen" }));
    expect(await screen.findByTestId("adyen-form")).toHaveTextContent(
      "adyen_session",
    );

    // A rule now excludes Adyen; the total is unchanged.
    rerender(
      section({
        ...cart,
        payment_methods: [stripeMethod, directMethod],
      } as Cart),
    );

    expect(await screen.findByTestId("stripe-form")).toHaveTextContent(
      "stripe_secret",
    );
    expect(createCheckoutPaymentSession).toHaveBeenLastCalledWith(
      cart.id,
      stripeMethod.id,
      expect.any(Object),
    );
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
  describe("Pay now when the billing address changes the total", () => {
    const taxedCart = {
      ...cart,
      total: "10.50",
      amount_due: "10.50",
    } as Cart;

    async function renderWithSavedCard(
      onUpdateBillingAddress: () => Promise<Cart | null>,
    ) {
      getCreditCards.mockResolvedValue({ data: [savedCard] });
      createCheckoutPaymentSession.mockResolvedValue(stripeSession);
      updateCheckoutPaymentSession.mockResolvedValue(stripeSession);
      vi.mocked(confirmWithSavedCard).mockReset();
      vi.mocked(confirmWithSavedCard).mockResolvedValue({});
      const onPaymentComplete = vi.fn().mockResolvedValue(true);
      const setProcessing = vi.fn();
      const ref = createRef<PaymentSectionHandle>();

      const view = render(
        section(cart, setProcessing, {
          ref,
          onUpdateBillingAddress,
          onPaymentComplete,
        }),
      );
      fireEvent.click(screen.getByRole("radio", { name: "Stripe" }));
      await waitFor(() =>
        expect(createCheckoutPaymentSession).toHaveBeenCalledWith(
          cart.id,
          stripeMethod.id,
          expect.objectContaining({
            stripe_payment_method_id: "pm_saved_card",
          }),
        ),
      );
      await act(async () => {});

      return { ...view, ref, setProcessing, onPaymentComplete };
    }

    it("does not charge the card the amount shown before the address was saved", async () => {
      const { ref, setProcessing, onPaymentComplete } =
        await renderWithSavedCard(vi.fn().mockResolvedValue(taxedCart));

      let result: { error?: string } | undefined;
      await act(async () => {
        result = await ref.current?.submit();
      });

      expect(result).toEqual({ error: "totalChanged" });
      expect(confirmWithSavedCard).not.toHaveBeenCalled();
      expect(onPaymentComplete).not.toHaveBeenCalled();
      expect(setProcessing).toHaveBeenLastCalledWith(false);
      expect(screen.getByText("totalChanged")).toBeInTheDocument();
    });

    it("does not complete a PayPal approval when saving the billing address changed the total", async () => {
      getCreditCards.mockResolvedValue({ data: [] });
      createCheckoutPaymentSession.mockResolvedValue({
        success: true,
        session: {
          id: "ps_paypal",
          external_id: "paypal_order",
          external_data: { client_id: "paypal_client", intent: "CAPTURE" },
        },
      });
      const onPaymentComplete = vi.fn().mockResolvedValue(true);
      const setProcessing = vi.fn();

      render(
        section(cart, setProcessing, {
          onUpdateBillingAddress: vi.fn().mockResolvedValue(taxedCart),
          onPaymentComplete,
        }),
      );
      fireEvent.click(screen.getByRole("radio", { name: "PayPal" }));
      await screen.findByTestId("paypal-form");

      let outcome: string | undefined;
      await act(async () => {
        outcome = await paypalForm.onApproved?.();
      });

      expect(outcome).toBe("failed");
      expect(onPaymentComplete).not.toHaveBeenCalled();
      expect(setProcessing).toHaveBeenLastCalledWith(false);
      expect(screen.getByText("totalChanged")).toBeInTheDocument();
    });

    it("does not place a direct payment order at a total the buyer has not seen", async () => {
      createDirectPayment.mockReset();
      const onPaymentComplete = vi.fn().mockResolvedValue(true);
      const setProcessing = vi.fn();
      const ref = createRef<PaymentSectionHandle>();

      render(
        section(cart, setProcessing, {
          ref,
          onUpdateBillingAddress: vi.fn().mockResolvedValue(taxedCart),
          onPaymentComplete,
        }),
      );

      let result: { error?: string } | undefined;
      await act(async () => {
        result = await ref.current?.submit();
      });

      expect(result).toEqual({ error: "totalChanged" });
      expect(createDirectPayment).not.toHaveBeenCalled();
      expect(onPaymentComplete).not.toHaveBeenCalled();
      expect(setProcessing).toHaveBeenLastCalledWith(false);
    });

    it("stops when the total moves while it waits for the session amount", async () => {
      const billingSave = deferred<Cart | null>();
      const amountUpdate = deferred<typeof stripeSession>();
      const { ref, rerender, onPaymentComplete } = await renderWithSavedCard(
        () => billingSave.promise,
      );
      updateCheckoutPaymentSession.mockReturnValue(amountUpdate.promise);

      let submitted: Promise<{ error?: string } | undefined> | undefined;
      await act(async () => {
        submitted = ref.current?.submit();
      });

      // A gift card removed in the summary re-prices the cart mid-submit.
      const higherCart = {
        ...cart,
        total: "12.00",
        amount_due: "12.00",
      } as Cart;
      rerender(
        section(higherCart, vi.fn(), {
          ref,
          onUpdateBillingAddress: () => billingSave.promise,
          onPaymentComplete,
        }),
      );

      let result: { error?: string } | undefined;
      await act(async () => {
        billingSave.resolve(cart);
        amountUpdate.resolve({
          ...stripeSession,
          session: { ...stripeSession.session, amount: "12.00" },
        } as typeof stripeSession);
        result = await submitted;
      });

      expect(result).toEqual({ error: "totalChanged" });
      expect(confirmWithSavedCard).not.toHaveBeenCalled();
      expect(onPaymentComplete).not.toHaveBeenCalled();
    });

    it("does not pay with a session the amount update replaced", async () => {
      const amountUpdate = deferred<typeof stripeSession>();
      const { ref, rerender, onPaymentComplete } = await renderWithSavedCard(
        vi.fn().mockResolvedValue(taxedCart),
      );
      updateCheckoutPaymentSession.mockReturnValue(amountUpdate.promise);

      rerender(
        section(taxedCart, vi.fn(), {
          ref,
          onUpdateBillingAddress: vi.fn().mockResolvedValue(taxedCart),
          onPaymentComplete,
        }),
      );

      let submitted: Promise<{ error?: string } | undefined> | undefined;
      await act(async () => {
        submitted = ref.current?.submit();
      });

      // The provider could not update in place and handed back a new secret.
      let result: { error?: string } | undefined;
      await act(async () => {
        amountUpdate.resolve({
          ...stripeSession,
          session: {
            ...stripeSession.session,
            external_data: { client_secret: "stripe_secret_2" },
          },
        });
        result = await submitted;
      });

      expect(result).toEqual({ error: "failedToInitPayment" });
      expect(confirmWithSavedCard).not.toHaveBeenCalled();
      expect(onPaymentComplete).not.toHaveBeenCalled();
    });

    it("does not complete a PayPal approval for an order created at another amount", async () => {
      getCreditCards.mockResolvedValue({ data: [] });
      createCheckoutPaymentSession.mockResolvedValue({
        success: true,
        session: {
          id: "ps_paypal",
          external_id: "paypal_order",
          amount: "10.00",
          external_data: { client_id: "paypal_client", intent: "CAPTURE" },
        },
      });
      // The update to the new total has not reached the PayPal order yet.
      updateCheckoutPaymentSession.mockReturnValue(new Promise(() => {}));
      const onPaymentComplete = vi.fn().mockResolvedValue(true);
      const handlers = {
        onUpdateBillingAddress: vi.fn().mockResolvedValue(taxedCart),
        onPaymentComplete,
      };

      const { rerender } = render(section(cart, vi.fn(), handlers));
      fireEvent.click(screen.getByRole("radio", { name: "PayPal" }));
      await screen.findByTestId("paypal-form");
      // The popup opens on the order created at 10.00.
      act(() => paypalForm.onOpen?.());
      // The total on screen already reads the new amount.
      rerender(section(taxedCart, vi.fn(), handlers));

      let outcome: string | undefined;
      await act(async () => {
        outcome = await paypalForm.onApproved?.();
      });

      expect(outcome).toBe("failed");
      expect(onPaymentComplete).not.toHaveBeenCalled();
      expect(screen.getByText("totalChanged")).toBeInTheDocument();
    });

    it("does not complete an approved PayPal order when an amount update lands during the billing save", async () => {
      getCreditCards.mockResolvedValue({ data: [] });
      createCheckoutPaymentSession.mockResolvedValue({
        success: true,
        session: {
          id: "ps_paypal",
          external_id: "paypal_order",
          amount: "10.00",
          external_data: { client_id: "paypal_client", intent: "CAPTURE" },
        },
      });
      const amountUpdate = deferred<unknown>();
      updateCheckoutPaymentSession.mockReturnValue(amountUpdate.promise);
      const billingSave = deferred<Cart | null>();
      const onPaymentComplete = vi.fn().mockResolvedValue(true);
      const handlers = {
        onUpdateBillingAddress: () => billingSave.promise,
        onPaymentComplete,
      };

      const { rerender } = render(section(cart, vi.fn(), handlers));
      fireEvent.click(screen.getByRole("radio", { name: "PayPal" }));
      await screen.findByTestId("paypal-form");
      act(() => paypalForm.onOpen?.());

      // The buyer approves the PayPal order created at 10.00.
      const approve = paypalForm.onApproved;
      let approval: Promise<string> | undefined;
      await act(async () => {
        approval = approve?.();
      });

      // Meanwhile the total moves and the session is updated to it, before
      // the billing save answers.
      rerender(section(taxedCart, vi.fn(), handlers));
      expect(updateCheckoutPaymentSession).toHaveBeenCalledWith(
        cart.id,
        "ps_paypal",
        { amount: "10.50" },
      );
      await act(async () => {
        amountUpdate.resolve({
          success: true,
          session: {
            id: "ps_paypal",
            external_id: "paypal_order",
            amount: "10.50",
            external_data: { client_id: "paypal_client", intent: "CAPTURE" },
          },
        });
      });

      let outcome: string | undefined;
      await act(async () => {
        billingSave.resolve(taxedCart);
        outcome = await approval;
      });

      expect(outcome).toBe("failed");
      expect(onPaymentComplete).not.toHaveBeenCalled();
      expect(screen.getByText("totalChanged")).toBeInTheDocument();
    });

    describe("a PayPal approval", () => {
      const paypalSession = (amount: string) => ({
        success: true,
        session: {
          id: "ps_paypal",
          external_id: "paypal_order",
          amount,
          external_data: { client_id: "paypal_client", intent: "CAPTURE" },
        },
      });

      async function openPayPal(currentCart: Cart, handlers: object) {
        getCreditCards.mockResolvedValue({ data: [] });
        createCheckoutPaymentSession.mockResolvedValue(
          paypalSession(amountDueOf(currentCart)),
        );
        const view = render(section(currentCart, vi.fn(), handlers));
        fireEvent.click(screen.getByRole("radio", { name: "PayPal" }));
        await screen.findByTestId("paypal-form");
        act(() => paypalForm.onOpen?.());
        return view;
      }

      function amountDueOf(currentCart: Cart): string {
        return (currentCart.amount_due ?? currentCart.total) as string;
      }

      it("completes when the order is unchanged since the popup opened", async () => {
        const onPaymentComplete = vi.fn().mockResolvedValue(true);
        const handlers = {
          onUpdateBillingAddress: vi.fn().mockResolvedValue(cart),
          onPaymentComplete,
        };
        await openPayPal(cart, handlers);

        let outcome: string | undefined;
        await act(async () => {
          outcome = await paypalForm.onApproved?.();
        });

        expect(outcome).toBe("completed");
        expect(onPaymentComplete).toHaveBeenCalledWith({
          type: "session",
          sessionId: "ps_paypal",
          sessionResult: undefined,
        });
      });

      it("sends amount updates one at a time and does not complete while one is pending", async () => {
        const onPaymentComplete = vi.fn().mockResolvedValue(true);
        const handlers = {
          onUpdateBillingAddress: vi.fn().mockResolvedValue(cart),
          onPaymentComplete,
        };
        const updates: Record<string, ReturnType<typeof deferred<unknown>>> = {
          "10.50": deferred(),
          "11.00": deferred(),
        };
        updateCheckoutPaymentSession.mockImplementation(
          async (_cartId: string, _sessionId: string, params: object) =>
            updates[(params as { amount: string }).amount].promise,
        );
        const { rerender } = await openPayPal(cart, handlers);

        await act(async () => {
          rerender(section(taxedCart, vi.fn(), handlers));
        });
        const higherCart = {
          ...cart,
          total: "11.00",
          amount_due: "11.00",
        } as Cart;
        await act(async () => {
          rerender(section(higherCart, vi.fn(), handlers));
        });
        // The newer update answers first; it has not even been sent, so the
        // older one cannot patch the order after it.
        await act(async () => {
          updates["11.00"].resolve(paypalSession("11.00"));
        });
        expect(updateCheckoutPaymentSession).toHaveBeenCalledTimes(1);
        expect(updateCheckoutPaymentSession).toHaveBeenLastCalledWith(
          cart.id,
          "ps_paypal",
          { amount: "10.50" },
        );

        let outcome: string | undefined;
        await act(async () => {
          outcome = await paypalForm.onApproved?.();
        });
        expect(outcome).toBe("failed");
        expect(onPaymentComplete).not.toHaveBeenCalled();

        // Once the older one settles, the newer one goes out after it.
        await act(async () => {
          updates["10.50"].resolve(paypalSession("10.50"));
        });
        expect(updateCheckoutPaymentSession).toHaveBeenCalledTimes(2);
        expect(updateCheckoutPaymentSession).toHaveBeenLastCalledWith(
          cart.id,
          "ps_paypal",
          { amount: "11.00" },
        );
      });

      it("does not complete when an amount update patched the order while the popup was open", async () => {
        const onPaymentComplete = vi.fn().mockResolvedValue(true);
        const handlers = {
          onUpdateBillingAddress: vi.fn().mockResolvedValue(taxedCart),
          onPaymentComplete,
        };
        updateCheckoutPaymentSession.mockResolvedValue(paypalSession("10.50"));
        const { rerender } = await openPayPal(cart, handlers);

        // The popup shows 10.00; the update to 10.50 lands before approval.
        await act(async () => {
          rerender(section(taxedCart, vi.fn(), handlers));
        });
        expect(updateCheckoutPaymentSession).toHaveBeenCalledWith(
          cart.id,
          "ps_paypal",
          { amount: "10.50" },
        );

        let outcome: string | undefined;
        await act(async () => {
          outcome = await paypalForm.onApproved?.();
        });

        expect(outcome).toBe("failed");
        expect(onPaymentComplete).not.toHaveBeenCalled();
        expect(screen.getByText("totalChanged")).toBeInTheDocument();
      });
    });

    it("charges once the session holds the new total", async () => {
      const amountUpdate = deferred<typeof stripeSession>();
      const { ref, rerender, onPaymentComplete } = await renderWithSavedCard(
        vi.fn().mockResolvedValue(taxedCart),
      );
      updateCheckoutPaymentSession.mockReturnValue(amountUpdate.promise);

      // The checkout shows the re-priced cart; the session follows it.
      rerender(
        section(taxedCart, vi.fn(), {
          ref,
          onUpdateBillingAddress: vi.fn().mockResolvedValue(taxedCart),
          onPaymentComplete,
        }),
      );
      expect(updateCheckoutPaymentSession).toHaveBeenCalledWith(
        cart.id,
        "ps_stripe",
        { amount: "10.50" },
      );

      let submitted: Promise<{ error?: string } | undefined> | undefined;
      await act(async () => {
        submitted = ref.current?.submit();
      });
      // Nothing is charged before the session holds the new amount.
      expect(confirmWithSavedCard).not.toHaveBeenCalled();

      await act(async () => {
        amountUpdate.resolve(stripeSession);
        await submitted;
      });

      expect(confirmWithSavedCard).toHaveBeenCalledTimes(1);
      expect(onPaymentComplete).toHaveBeenCalledWith({
        type: "session",
        sessionId: "ps_stripe",
      });
    });
  });
});
