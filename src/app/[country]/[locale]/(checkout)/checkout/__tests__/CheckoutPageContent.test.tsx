import type { Cart } from "@spree/sdk";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.fn();

vi.mock("next-intl", async () => {
  const actual = await vi.importActual("next-intl");
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  };
});

vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("@/contexts/CheckoutContext", () => ({
  useCheckout: () => ({ setSummaryContent: vi.fn() }),
}));
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ cart: null }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

// Saves on blur, as the real address block does when focus leaves it.
vi.mock("@/components/checkout/AddressSection", () => ({
  AddressSection: ({
    onAutoSave,
  }: {
    onAutoSave: (data: { email: string }) => Promise<void>;
  }) => (
    <input
      aria-label="address"
      onBlur={() => {
        void onAutoSave({ email: "buyer@example.com" });
      }}
    />
  ),
}));
vi.mock("@/components/checkout/PaymentSection", () => ({
  PaymentSection: ({ ref }: { ref: React.Ref<{ submit: () => void }> }) => {
    useImperativeHandle(ref, () => ({ submit: mockSubmit }));
    return null;
  },
}));

vi.mock("@/lib/analytics/gtm", () => ({
  trackAddPaymentInfo: vi.fn(),
  trackAddShippingInfo: vi.fn(),
  trackBeginCheckout: vi.fn(),
}));
vi.mock("@/lib/data/addresses", () => ({
  getAddresses: vi.fn(),
  updateAddress: vi.fn(),
}));
vi.mock("@/lib/data/checkout", () => ({
  applyCode: vi.fn(),
  getCheckoutOrder: vi.fn(),
  removeDiscountCode: vi.fn(),
  removeGiftCard: vi.fn(),
  selectDeliveryRate: vi.fn(),
  updateOrderAddresses: vi.fn(),
}));
vi.mock("@/lib/data/cookies", () => ({ isAuthenticated: vi.fn() }));
vi.mock("@/lib/data/countries", () => ({ getCountry: vi.fn() }));
vi.mock("@/lib/data/markets", () => ({
  getMarketCountries: vi.fn(),
  resolveMarket: vi.fn(),
}));
vi.mock("@/lib/data/payment", () => ({
  completeCheckoutOrder: vi.fn(),
  completeCheckoutPaymentSession: vi.fn(),
}));

import { getCheckoutOrder, updateOrderAddresses } from "@/lib/data/checkout";
import { CheckoutPageContent } from "../[id]/CheckoutPageContent";

const mockGetCheckoutOrder = vi.mocked(getCheckoutOrder);
const mockUpdateOrderAddresses = vi.mocked(updateOrderAddresses);

function buildCart(fulfillments: unknown[]): Cart {
  return {
    id: "cart_1",
    email: "buyer@example.com",
    total: "94.98",
    current_step: "payment",
    items: [{ id: "li_1", quantity: 1 }],
    requirements: [
      { step: "payment", field: "payment", message: "Add a payment method" },
    ],
    fulfillments,
  } as unknown as Cart;
}

const standard = {
  id: "ful_2",
  stock_location: null,
  delivery_rates: [
    {
      id: "rate_pickup",
      name: "Store Pickup",
      display_cost: "$0.00",
      selected: false,
    },
    {
      id: "rate_standard",
      name: "Standard",
      display_cost: "$5.00",
      selected: true,
    },
  ],
};

function renderCheckout(shownCart: Cart) {
  return render(
    <CheckoutPageContent
      cartId="cart_1"
      urlCountry="us"
      initialData={{
        cart: shownCart,
        countries: [],
        savedAddresses: [],
        isAuthenticated: true,
      }}
    />,
  );
}

// The press leaves the address block between pointerdown and click, as a
// real mouse press does when the address field still has focus.
async function pressPlaceOrder({ leavingAddress = false } = {}) {
  const button = screen.getByRole("button", { name: "payNow" });
  await act(async () => {
    fireEvent.pointerDown(button, { button: 0 });
    if (leavingAddress) fireEvent.blur(screen.getByLabelText("address"));
    fireEvent.click(button);
  });
}

describe("CheckoutPageContent Place Order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("stops and points at delivery when the press saved an address the buyer had not seen options for", async () => {
    renderCheckout(buildCart([]));
    mockGetCheckoutOrder.mockResolvedValue(buildCart([standard]));
    expect(
      screen.getByText("enterShippingAddressForMethods"),
    ).toBeInTheDocument();

    await pressPlaceOrder();

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("chooseDeliveryMethod")).toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement?.closest("label")).toHaveTextContent(
      "Standard",
    );
  });

  it("waits for the address save the press started before reading the cart", async () => {
    renderCheckout(buildCart([]));
    type SaveResult = Awaited<ReturnType<typeof updateOrderAddresses>>;
    let resolveSave: (result: SaveResult) => void = () => {};
    mockUpdateOrderAddresses.mockReturnValue(
      new Promise<SaveResult>((resolve) => {
        resolveSave = resolve;
      }),
    );
    let saved = false;
    mockGetCheckoutOrder.mockImplementation(async () =>
      buildCart(saved ? [standard] : []),
    );

    await pressPlaceOrder({ leavingAddress: true });
    await act(async () => {
      saved = true;
      resolveSave({ success: true, cart: buildCart([standard]) });
    });

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("chooseDeliveryMethod")).toBeInTheDocument();
  });

  it("stops without reading the cart when the address save the press started fails", async () => {
    renderCheckout(buildCart([standard]));
    mockUpdateOrderAddresses.mockResolvedValue({
      success: false,
      error: "Postal code is invalid",
    } as Awaited<ReturnType<typeof updateOrderAddresses>>);

    await pressPlaceOrder({ leavingAddress: true });

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockGetCheckoutOrder).not.toHaveBeenCalled();
    expect(screen.getByText("Postal code is invalid")).toBeInTheDocument();
  });

  it("pays when the delivery on screen is the one the server holds", async () => {
    renderCheckout(buildCart([standard]));
    mockGetCheckoutOrder.mockResolvedValue(buildCart([standard]));

    await pressPlaceOrder();

    expect(mockSubmit).toHaveBeenCalledOnce();
    expect(screen.queryByText("chooseDeliveryMethod")).not.toBeInTheDocument();
  });

  it("pays when a rebuild kept the same delivery under new ids", async () => {
    renderCheckout(buildCart([standard]));
    mockGetCheckoutOrder.mockResolvedValue(
      buildCart([
        {
          ...standard,
          id: "ful_3",
          delivery_rates: standard.delivery_rates.map((rate) => ({
            ...rate,
            id: `${rate.id}_rebuilt`,
          })),
        },
      ]),
    );

    await pressPlaceOrder();

    expect(mockSubmit).toHaveBeenCalledOnce();
  });
});
