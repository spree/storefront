import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  carts: {
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    fulfillments: { update: vi.fn() },
    discountCodes: { apply: vi.fn(), remove: vi.fn() },
    giftCards: { apply: vi.fn(), remove: vi.fn() },
  },
  orders: { get: vi.fn() },
};

vi.mock("@/lib/spree", () => ({
  getClient: () => mockClient,
  getClientForSurface: () => mockClient,
  cacheTagSuffix: () => "",
  DEFAULT_SURFACE: "dtc",
  isWholesaleEnabled: vi.fn().mockReturnValue(false),
  getCartToken: vi.fn().mockResolvedValue("order-token-123"),
  // DTC cart only; the wholesale cart cookie is absent so poison/surface
  // checks resolve to DTC.
  getCartId: vi.fn((surface = "dtc") =>
    Promise.resolve(surface === "wholesale" ? undefined : "order-1"),
  ),
  getAccessToken: vi.fn().mockResolvedValue(undefined),
  setCartCookies: vi.fn(),
  clearCartCookies: vi.fn(),
  // No wholesale cookie in these DTC tests → never poisoned.
  isPoisonedDtcCartId: vi.fn().mockResolvedValue(false),
  getCartOptions: vi.fn().mockResolvedValue({
    spreeToken: "order-token-123",
    token: undefined,
  }),
  requireCartId: vi.fn().mockResolvedValue("order-1"),
  withAuthRefresh: vi.fn(
    async (fn: (options: { token: string }) => Promise<unknown>) => {
      return fn({ token: "jwt-token" });
    },
  ),
}));

vi.mock("@spree/sdk", () => ({
  SpreeError: class SpreeError extends Error {
    code: string;
    status: number;
    constructor(
      response: { error: { code: string; message: string } },
      status: number,
    ) {
      super(response.error.message);
      this.code = response.error.code;
      this.status = status;
    }
  },
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
}));

import {
  applyCode,
  getCheckoutOrder,
  removeDiscountCode,
  removeGiftCard,
  selectDeliveryRate,
  updateCartMarket,
  updateCartPoNumber,
  updateOrderAddresses,
} from "@/lib/data/checkout";

const mockOrder = {
  id: "order-1",
  number: "R100",
  current_step: "address",
};

describe("checkout server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCheckoutOrder", () => {
    it("returns cart when still in checkout", async () => {
      mockClient.carts.get.mockResolvedValue(mockOrder);

      const result = await getCheckoutOrder("order-1");

      expect(mockClient.carts.get).toHaveBeenCalled();
      expect(result).toBe(mockOrder);
    });

    // A Spree 6 order has completed_at but no checkout step.
    const placedOrder = {
      id: "or_1",
      cart_id: "order-1",
      number: "R100",
      completed_at: "2026-11-24T12:00:00.000Z",
    };

    it("marks the order a completed cart became as complete", async () => {
      mockClient.carts.get.mockRejectedValue(new Error("Not found"));
      mockClient.orders.get.mockResolvedValue(placedOrder);

      const result = await getCheckoutOrder("order-1");

      expect(mockClient.orders.get).toHaveBeenCalledWith(
        "order-1",
        undefined,
        expect.anything(),
      );
      expect(result).toEqual({ ...placedOrder, current_step: "complete" });
    });

    it("marks a split checkout's order group as complete", async () => {
      const orderGroup = {
        id: "ogrp_1",
        number: "R100",
        orders: [placedOrder, { ...placedOrder, id: "or_2", number: "R101" }],
      };
      mockClient.carts.get.mockRejectedValue(new Error("Not found"));
      mockClient.orders.get.mockResolvedValue(orderGroup);

      const result = await getCheckoutOrder("order-1");

      expect(result).toEqual({ ...orderGroup, current_step: "complete" });
    });

    it("answers with the placed order when a newer cart is open", async () => {
      mockClient.carts.get.mockResolvedValue({ ...mockOrder, id: "cart_new" });
      mockClient.orders.get.mockResolvedValue(placedOrder);

      const result = await getCheckoutOrder("order-1");

      expect(result).toEqual({ ...placedOrder, current_step: "complete" });
    });

    it("returns null when both cart and order fail", async () => {
      mockClient.carts.get.mockRejectedValue(new Error("Not found"));
      mockClient.orders.get.mockRejectedValue(new Error("Not found"));

      const result = await getCheckoutOrder("bad-id");

      expect(result).toBeNull();
    });
  });

  describe("updateOrderAddresses", () => {
    it("returns success with order", async () => {
      mockClient.carts.update.mockResolvedValue(mockOrder);
      const addresses = { email: "test@example.com" };

      const result = await updateOrderAddresses("order-1", addresses);

      expect(mockClient.carts.update).toHaveBeenCalledWith(
        "order-1",
        addresses,
        {
          spreeToken: "order-token-123",
          token: undefined,
        },
      );
      expect(result).toEqual({ success: true, cart: mockOrder });
    });

    it("returns error on failure", async () => {
      mockClient.carts.update.mockRejectedValue(new Error("Invalid address"));

      const result = await updateOrderAddresses("order-1", {});

      expect(result).toEqual({
        success: false,
        error: "Invalid address",
      });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockClient.carts.update.mockRejectedValue("unexpected");

      const result = await updateOrderAddresses("order-1", {});

      expect(result).toEqual({
        success: false,
        error: "Failed to update addresses",
      });
    });
  });

  describe("updateCartPoNumber", () => {
    it("writes the trimmed reference to the cart", async () => {
      const updatedOrder = { ...mockOrder, po_number: "PO-2026-0418" };
      mockClient.carts.update.mockResolvedValue(updatedOrder);

      const result = await updateCartPoNumber("order-1", "  PO-2026-0418 ");

      expect(mockClient.carts.update).toHaveBeenCalledWith(
        "order-1",
        { po_number: "PO-2026-0418" },
        { spreeToken: "order-token-123", token: undefined },
      );
      expect(result).toEqual({ success: true, cart: updatedOrder });
    });

    it("clears the reference when the field is emptied", async () => {
      mockClient.carts.update.mockResolvedValue(mockOrder);

      await updateCartPoNumber("order-1", "   ");

      expect(mockClient.carts.update).toHaveBeenCalledWith(
        "order-1",
        { po_number: null },
        { spreeToken: "order-token-123", token: undefined },
      );
    });

    it("returns error on failure", async () => {
      mockClient.carts.update.mockRejectedValue("unexpected");

      const result = await updateCartPoNumber("order-1", "PO-1");

      expect(result).toEqual({
        success: false,
        error: "Failed to save the purchase order number",
      });
    });
  });

  describe("updateCartMarket", () => {
    it("returns success with updated order", async () => {
      const updatedOrder = { ...mockOrder, currency: "EUR", locale: "de" };
      mockClient.carts.update.mockResolvedValue(updatedOrder);

      const result = await updateCartMarket("order-1", {
        currency: "EUR",
        locale: "de",
      });

      expect(mockClient.carts.update).toHaveBeenCalledWith(
        "order-1",
        { currency: "EUR", locale: "de" },
        { spreeToken: "order-token-123", token: undefined },
      );
      expect(result).toEqual({ success: true, cart: updatedOrder });
    });

    it("returns error on failure", async () => {
      mockClient.carts.update.mockRejectedValue(
        new Error("Currency not supported"),
      );

      const result = await updateCartMarket("order-1", {
        currency: "JPY",
        locale: "en",
      });

      expect(result).toEqual({
        success: false,
        error: "Currency not supported",
      });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockClient.carts.update.mockRejectedValue("unexpected");

      const result = await updateCartMarket("order-1", {
        currency: "EUR",
        locale: "de",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to update order market",
      });
    });
  });

  describe("selectDeliveryRate", () => {
    it("returns success", async () => {
      mockClient.carts.fulfillments.update.mockResolvedValue(undefined);

      const result = await selectDeliveryRate("order-1", "ship-1", "rate-1");

      expect(mockClient.carts.fulfillments.update).toHaveBeenCalledWith(
        "order-1",
        "ship-1",
        { selected_delivery_rate_id: "rate-1" },
        { spreeToken: "order-token-123", token: undefined },
      );
      expect(result).toEqual({ success: true });
    });

    it("returns error on failure", async () => {
      mockClient.carts.fulfillments.update.mockRejectedValue(
        new Error("Rate not available"),
      );

      const result = await selectDeliveryRate("order-1", "ship-1", "rate-1");

      expect(result).toEqual({
        success: false,
        error: "Rate not available",
      });
    });
  });

  describe("applyCode", () => {
    it("applies discount code when valid", async () => {
      mockClient.carts.discountCodes.apply.mockResolvedValue(mockOrder);

      const result = await applyCode("order-1", "SAVE10");

      expect(result).toEqual({
        success: true,
        cart: mockOrder,
        type: "discount",
      });
      expect(mockClient.carts.giftCards.apply).not.toHaveBeenCalled();
    });

    it("falls back to gift card when discount code returns 422", async () => {
      const { SpreeError } = await import("@spree/sdk");
      mockClient.carts.discountCodes.apply.mockRejectedValue(
        new SpreeError(
          {
            error: { code: "processing_error", message: "Coupon not found" },
          },
          422,
        ),
      );
      mockClient.carts.giftCards.apply.mockResolvedValue(mockOrder);

      const result = await applyCode("order-1", "GC-ABCD-1234");

      expect(result).toEqual({
        success: true,
        cart: mockOrder,
        type: "gift_card",
      });
    });

    it("returns error when both discount and gift card fail", async () => {
      const { SpreeError } = await import("@spree/sdk");
      mockClient.carts.discountCodes.apply.mockRejectedValue(
        new SpreeError(
          {
            error: { code: "processing_error", message: "Coupon not found" },
          },
          422,
        ),
      );
      mockClient.carts.giftCards.apply.mockRejectedValue(
        new SpreeError(
          {
            error: {
              code: "gift_card_not_found",
              message: "Gift card not found",
            },
          },
          404,
        ),
      );

      const result = await applyCode("order-1", "INVALID");

      expect(result).toEqual({
        success: false,
        error: "Coupon not found",
      });
    });

    it("shows backend gift card error when gift card is expired", async () => {
      const { SpreeError } = await import("@spree/sdk");
      mockClient.carts.discountCodes.apply.mockRejectedValue(
        new SpreeError(
          {
            error: { code: "processing_error", message: "Coupon not found" },
          },
          422,
        ),
      );
      mockClient.carts.giftCards.apply.mockRejectedValue(
        new SpreeError(
          {
            error: {
              code: "gift_card_expired",
              message: "The Gift Card has expired.",
            },
          },
          422,
        ),
      );

      const result = await applyCode("order-1", "EXPIRED-GC");

      expect(result).toEqual({
        success: false,
        error: "The Gift Card has expired.",
      });
    });

    it("does not fall back to gift card on network errors", async () => {
      mockClient.carts.discountCodes.apply.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await applyCode("order-1", "SAVE10");

      expect(result).toEqual({ success: false, error: "Network error" });
      expect(mockClient.carts.giftCards.apply).not.toHaveBeenCalled();
    });

    it("does not fall back to gift card on 500 errors", async () => {
      const { SpreeError } = await import("@spree/sdk");
      mockClient.carts.discountCodes.apply.mockRejectedValue(
        new SpreeError(
          {
            error: {
              code: "internal_error",
              message: "Internal server error",
            },
          },
          500,
        ),
      );

      const result = await applyCode("order-1", "SAVE10");

      expect(result).toEqual({
        success: false,
        error: "Internal server error",
      });
      expect(mockClient.carts.giftCards.apply).not.toHaveBeenCalled();
    });
  });

  describe("removeDiscountCode", () => {
    it("returns success with order", async () => {
      mockClient.carts.discountCodes.remove.mockResolvedValue(mockOrder);

      const result = await removeDiscountCode("order-1", "SAVE10");

      expect(mockClient.carts.discountCodes.remove).toHaveBeenCalledWith(
        "order-1",
        "SAVE10",
        {
          spreeToken: "order-token-123",
          token: undefined,
        },
      );
      expect(result).toEqual({ success: true, cart: mockOrder });
    });

    it("returns error on failure", async () => {
      mockClient.carts.discountCodes.remove.mockRejectedValue(
        new Error("Promotion not found"),
      );

      const result = await removeDiscountCode("order-1", "SAVE10");

      expect(result).toEqual({
        success: false,
        error: "Promotion not found",
      });
    });
  });

  describe("removeGiftCard", () => {
    it("returns success with order", async () => {
      mockClient.carts.giftCards.remove.mockResolvedValue(mockOrder);

      const result = await removeGiftCard("order-1", "gc_abc123");

      expect(mockClient.carts.giftCards.remove).toHaveBeenCalledWith(
        "order-1",
        "gc_abc123",
        {
          spreeToken: "order-token-123",
          token: undefined,
        },
      );
      expect(result).toEqual({ success: true, cart: mockOrder });
    });

    it("returns error on failure", async () => {
      mockClient.carts.giftCards.remove.mockRejectedValue(
        new Error("Gift card not found"),
      );

      const result = await removeGiftCard("order-1", "gc_abc123");

      expect(result).toEqual({
        success: false,
        error: "Gift card not found",
      });
    });
  });
});
