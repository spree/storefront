import { act, render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next-intl", async () => {
  const actual = await vi.importActual("next-intl");
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/us/en/confirm-payment/cart-1",
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/data/payment", () => ({
  confirmPaymentAndCompleteCart: vi.fn(),
}));

vi.mock("@/lib/utils/path", () => ({
  extractBasePath: (path: string) => {
    const match = path.match(/^\/[^/]+\/[^/]+/);
    return match ? match[0] : "";
  },
}));

import { confirmPaymentAndCompleteCart } from "@/lib/data/payment";
import ConfirmPaymentPage from "../[id]/page";

const mockConfirm = vi.mocked(confirmPaymentAndCompleteCart);
const zeroMoney = {
  item_total: "0",
  display_item_total: "$0.00",
  discount_total: "0",
  display_discount_total: "$0.00",
  tax_total: "0",
  display_tax_total: "$0.00",
  included_tax_total: "0",
  display_included_tax_total: "$0.00",
  additional_tax_total: "0",
  display_additional_tax_total: "$0.00",
  delivery_total: "0",
  display_delivery_total: "$0.00",
  fee_total: "0",
  display_fee_total: "$0.00",
  gift_card_total: "0",
  display_gift_card_total: "$0.00",
  store_credit_total: "0",
  display_store_credit_total: "$0.00",
  total: "0",
  display_total: "$0.00",
  amount_due: "0",
  display_amount_due: "$0.00",
} as const;
const completedGroup = {
  id: "cart-1",
  number: "G1",
  email: null,
  currency: "USD",
  ...zeroMoney,
  covered_by_store_credit: false,
  payments: [],
  fulfillment_status: null,
  payment_status: "paid",
  completed_at: "2026-10-02T00:00:00Z",
  billing_address: null,
  shipping_address: null,
  orders: [],
} satisfies import("@/lib/spree/checkout-result").CompletedOrderGroup;

function renderPage(params = { id: "cart-1", country: "us", locale: "en" }) {
  const resolvedParams = Promise.resolve(params);
  return render(
    <Suspense fallback={<div>suspense-fallback</div>}>
      <ConfirmPaymentPage params={resolvedParams} />
    </Suspense>,
  );
}

describe("ConfirmPaymentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("shows loading spinner", async () => {
    mockConfirm.mockReturnValue(new Promise(() => {})); // never resolves

    await act(async () => {
      renderPage();
    });

    expect(screen.getByText("confirmingPayment")).toBeInTheDocument();
  });

  it("redirects to order-placed on success", async () => {
    mockSearchParams.set("session", "session-1");
    mockConfirm.mockResolvedValue({
      success: true as const,
      order: completedGroup,
    });

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        "cart-1",
        "session-1",
        undefined,
        undefined,
        undefined,
      );
      expect(mockReplace).toHaveBeenCalledWith("/us/en/order-placed/cart-1");
    });
  });

  it("passes sessionResult query param to confirmPaymentAndCompleteCart", async () => {
    mockSearchParams.set("session", "session-1");
    mockSearchParams.set("sessionResult", "eyJhYmMiOiJ4eXoifQ==");
    mockConfirm.mockResolvedValue({
      success: true as const,
      order: completedGroup,
    });

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        "cart-1",
        "session-1",
        "eyJhYmMiOiJ4eXoifQ==",
        undefined,
        undefined,
      );
    });
  });

  it("redirects to checkout with error on failure", async () => {
    mockSearchParams.set("session", "session-1");
    mockConfirm.mockResolvedValue({
      success: false as const,
      error: "Payment declined",
    });

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        "/us/en/checkout/cart-1?payment_error=Payment%20declined",
      );
    });
  });

  it("passes undefined session when no query param", async () => {
    mockConfirm.mockResolvedValue({
      success: true as const,
      order: completedGroup,
    });

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        "cart-1",
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(mockReplace).toHaveBeenCalledWith("/us/en/order-placed/cart-1");
    });
  });

  it("uses fallback error message when none provided", async () => {
    mockSearchParams.set("session", "session-1");
    mockConfirm.mockResolvedValue({
      success: false as const,
      error: "",
    });

    await act(async () => {
      renderPage();
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining(
          "/us/en/checkout/cart-1?payment_error=paymentError",
        ),
      );
    });
  });

  it("only calls confirm once (idempotent)", async () => {
    mockSearchParams.set("session", "session-1");
    mockConfirm.mockResolvedValue({
      success: true as const,
      order: completedGroup,
    });

    let result: ReturnType<typeof renderPage>;
    await act(async () => {
      result = renderPage();
    });

    // Re-render to simulate React strict mode double-effect
    await act(async () => {
      result!.rerender(
        <Suspense fallback={<div>suspense-fallback</div>}>
          <ConfirmPaymentPage
            params={Promise.resolve({
              id: "cart-1",
              country: "us",
              locale: "en",
            })}
          />
        </Suspense>,
      );
    });

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
