import type { Cart, Country, State } from "@spree/sdk";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCheckoutPaymentSession,
  updateCheckoutPaymentSession,
} from "@/lib/data/payment";
import { PaymentSection, type PaymentSectionHandle } from "../PaymentSection";

// Bank transfer is a payment session with no gateway SDK: creating it applies
// the gem's discount to the cart, and the storefront's own button places the
// order. The reference and bank details only appear once the order is placed.

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));
vi.mock("@/components/checkout/PayPalPaymentForm", () => ({
  PayPalPaymentForm: () => null,
}));
vi.mock("@/components/checkout/AdyenPaymentForm", () => ({
  AdyenPaymentForm: () => null,
}));
vi.mock("@/components/checkout/StripePaymentForm", () => ({
  StripePaymentForm: () => null,
  confirmWithSavedCard: vi.fn(),
}));
vi.mock("@/lib/data/credit-cards", () => ({ getCreditCards: vi.fn() }));
vi.mock("@/lib/data/payment", () => ({
  createCheckoutPaymentSession: vi.fn(),
  createDirectPayment: vi.fn(),
  getCheckoutPaymentSession: vi.fn(),
  updateCheckoutPaymentSession: vi.fn(),
}));

const COUNTRIES = [
  { iso: "GB", name: "United Kingdom" },
] as unknown as Country[];

const PAYPAL = {
  id: "pm_paypal",
  name: "PayPal",
  type: "paypal_checkout",
  session_required: true,
  bank_transfer: null,
};

function bankMethod(discountPercent = "3") {
  return {
    id: "pm_bank",
    name: "Bank transfer",
    type: "bank_transfer",
    session_required: true,
    bank_transfer: { discount_percent: discountPercent, expiry_days: 7 },
  };
}

function cart(overrides: Record<string, unknown> = {}): Cart {
  return {
    id: "cart_1",
    currency: "GBP",
    total: "78.00",
    amount_due: "78.00",
    items: [{ id: "li_1" }],
    payment_methods: [bankMethod(), PAYPAL],
    shipping_address: { country_code: "GB" },
    ...overrides,
  } as unknown as Cart;
}

// The cart as the backend returns it once the bank transfer session exists:
// 3% off the items.
const DISCOUNTED = cart({ total: "75.66", amount_due: "75.66" });

const BANK_SESSION = {
  id: "ps_bank",
  external_id: "ACME-7Q4X2",
  external_data: {
    bank_transfer: {
      reference: "ACME-7Q4X2",
      amount: "75.66",
      currency: "GBP",
      expires_at: "2026-11-11T12:00:00Z",
      discount_percent: "3",
      bank_details: [
        {
          label: "UK payments",
          fields: [{ label: "Account number", value: "12345678" }],
        },
      ],
    },
  },
};

function props(c: Cart) {
  return {
    cart: c,
    countries: COUNTRIES,
    isAuthenticated: false,
    fetchStates: vi.fn(async () => [] as unknown as State[]),
    onUpdateBillingAddress: vi.fn().mockResolvedValue(true),
    onPaymentComplete: vi.fn().mockResolvedValue(true),
    onCartUpdated: vi.fn(),
    onSessionMethodChange: vi.fn(),
    processing: false,
    setProcessing: vi.fn(),
  };
}

async function sessionCreated(times = 1) {
  await waitFor(() =>
    expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(times),
  );
}

// Lets a session create that should not happen get the chance to.
async function settle() {
  await act(() => new Promise((r) => setTimeout(r, 50)));
}

describe("PaymentSection bank transfer", () => {
  beforeEach(() => {
    vi.mocked(updateCheckoutPaymentSession).mockReset();
    vi.mocked(createCheckoutPaymentSession).mockReset();
    vi.mocked(createCheckoutPaymentSession).mockResolvedValue({
      success: true,
      session: BANK_SESSION,
      cart: DISCOUNTED,
    } as never);
  });

  it("creates a bank transfer session when it is chosen", async () => {
    render(<PaymentSection {...props(cart())} />);

    await sessionCreated();
    expect(createCheckoutPaymentSession).toHaveBeenCalledWith(
      "cart_1",
      "pm_bank",
      expect.any(Object),
    );
  });

  it("hands the checkout the cart the session returned", async () => {
    const p = props(cart());
    render(<PaymentSection {...p} />);

    await waitFor(() =>
      expect(p.onCartUpdated).toHaveBeenCalledWith(DISCOUNTED),
    );
  });

  it("shows what the refreshed cart says is due", async () => {
    const { rerender } = render(<PaymentSection {...props(cart())} />);
    await sessionCreated();

    rerender(<PaymentSection {...props(DISCOUNTED)} />);

    expect(
      await screen.findByText("bankTransferAmountDue:£75.66"),
    ).toBeInTheDocument();
  });

  it("does not recreate the session for the total its own discount set", async () => {
    const { rerender } = render(<PaymentSection {...props(cart())} />);
    await sessionCreated();

    rerender(<PaymentSection {...props(DISCOUNTED)} />);
    await settle();

    expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(1);
    expect(updateCheckoutPaymentSession).not.toHaveBeenCalled();
  });

  // A reload of a cart that already held a bank transfer session, with PayPal
  // listed first: creating the PayPal session releases bank transfer and the
  // discount comes off. That PayPal session was sized for the full total.
  it("does not recreate a PayPal session when leaving bank transfer raised the total", async () => {
    vi.mocked(createCheckoutPaymentSession).mockResolvedValue({
      success: true,
      session: { id: "ps_paypal", external_data: { id: "PAYPAL-ORDER-1" } },
      cart: cart({ payment_methods: [PAYPAL, bankMethod()] }),
    } as never);
    const discounted = cart({
      total: "75.66",
      amount_due: "75.66",
      payment_methods: [PAYPAL, bankMethod()],
    });
    const { rerender } = render(<PaymentSection {...props(discounted)} />);
    await sessionCreated();

    rerender(
      <PaymentSection
        {...props(cart({ payment_methods: [PAYPAL, bankMethod()] }))}
      />,
    );
    await settle();

    expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(1);
    expect(updateCheckoutPaymentSession).not.toHaveBeenCalled();
  });

  it("never shows the reference before the order is placed", async () => {
    render(<PaymentSection {...props(cart())} />);
    await sessionCreated();
    await screen.findByText(/bankTransferAfterOrder/);

    expect(screen.queryByText(/ACME-7Q4X2/)).toBeNull();
    expect(screen.queryByText(/12345678/)).toBeNull();
  });

  it("places the order with the bank transfer session", async () => {
    const ref = createRef<PaymentSectionHandle>();
    const p = props(cart());
    render(<PaymentSection ref={ref} {...p} />);
    await screen.findByText(/bankTransferAfterOrder/);

    let result: { error?: string } | undefined;
    await act(async () => {
      result = await ref.current?.submit();
    });

    expect(result).toEqual({});
    // Bank transfer moves no money at placement, so a failure is a refusal.
    expect(p.onPaymentComplete).toHaveBeenCalledWith({
      type: "session",
      sessionId: "ps_bank",
    });
  });

  it("asks for Place Order, not Pay Now", async () => {
    const p = props(cart());
    render(<PaymentSection {...p} />);
    await sessionCreated();

    expect(p.onSessionMethodChange).toHaveBeenLastCalledWith(false);
  });

  it("advertises the discount on the method", async () => {
    const { unmount } = render(<PaymentSection {...props(cart())} />);
    expect(screen.getByText("saveDiscount:3")).toBeInTheDocument();
    unmount();

    render(
      <PaymentSection
        {...props(cart({ payment_methods: [bankMethod("0"), PAYPAL] }))}
      />,
    );
    expect(screen.queryByText(/saveDiscount/)).toBeNull();
  });

  // A released or expired quote can't be completed: the gem answers 422 and
  // the buyer must choose bank transfer again. It is already chosen, so a
  // fresh session has to start here, for the next Place Order to use.
  it("starts a fresh session when placing the order could not use the old one", async () => {
    const ref = createRef<PaymentSectionHandle>();
    const p = props(cart());
    p.onPaymentComplete.mockResolvedValue(false);
    render(<PaymentSection ref={ref} {...p} />);
    await screen.findByText(/bankTransferAfterOrder/);

    await act(async () => {
      await ref.current?.submit();
    });

    await sessionCreated(2);
    expect(createCheckoutPaymentSession).toHaveBeenLastCalledWith(
      "cart_1",
      "pm_bank",
      expect.any(Object),
    );
  });

  it("keeps the session once the order is placed", async () => {
    const ref = createRef<PaymentSectionHandle>();
    const p = props(cart());
    p.onPaymentComplete.mockResolvedValue(true);
    render(<PaymentSection ref={ref} {...p} />);
    await screen.findByText(/bankTransferAfterOrder/);

    await act(async () => {
      await ref.current?.submit();
    });
    await settle();

    expect(createCheckoutPaymentSession).toHaveBeenCalledTimes(1);
  });
});
