import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@spree/next", () => ({
  getCheckout: vi.fn(),
  updateOrder: vi.fn(),
  advance: vi.fn(),
  getShipments: vi.fn(),
  selectShippingRate: vi.fn(),
  applyCoupon: vi.fn(),
  removeCoupon: vi.fn(),
  complete: vi.fn(),
}));

import {
  advance,
  applyCoupon,
  complete,
  getCheckout,
  getShipments as getShipmentsSdk,
  removeCoupon,
  selectShippingRate as selectShippingRateSdk,
  updateOrder,
} from "@spree/next";

import {
  advanceCheckout,
  applyCouponCode,
  completeOrder,
  getCheckoutOrder,
  getShipments,
  removeCouponCode,
  selectShippingRate,
  updateOrderAddresses,
  updateOrderMarket,
} from "@/lib/data/checkout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixtures are intentionally partial
const mockGetCheckout = getCheckout as any;
const mockUpdateOrder = updateOrder as any;
const mockAdvance = advance as any;
const mockGetShipments = getShipmentsSdk as any;
const mockSelectShippingRate = selectShippingRateSdk as any;
const mockApplyCoupon = applyCoupon as any;
const mockRemoveCoupon = removeCoupon as any;
const mockComplete = complete as any;

const mockOrder = { id: "order-1", number: "R100", state: "address" };
const mockShipments = [{ id: "ship-1", shipping_rates: [] }];

describe("checkout server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCheckoutOrder", () => {
    it("returns order on success", async () => {
      mockGetCheckout.mockResolvedValue(mockOrder);

      const result = await getCheckoutOrder("order-1");

      expect(mockGetCheckout).toHaveBeenCalledWith("order-1");
      expect(result).toBe(mockOrder);
    });

    it("returns null on failure", async () => {
      mockGetCheckout.mockRejectedValue(new Error("Not found"));

      const result = await getCheckoutOrder("bad-id");

      expect(result).toBeNull();
    });
  });

  describe("updateOrderAddresses", () => {
    it("returns success with order", async () => {
      mockUpdateOrder.mockResolvedValue(mockOrder);
      const addresses = { email: "test@example.com" };

      const result = await updateOrderAddresses("order-1", addresses);

      expect(mockUpdateOrder).toHaveBeenCalledWith("order-1", addresses);
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("returns error on failure", async () => {
      mockUpdateOrder.mockRejectedValue(new Error("Invalid address"));

      const result = await updateOrderAddresses("order-1", {});

      expect(result).toEqual({
        success: false,
        error: "Invalid address",
      });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockUpdateOrder.mockRejectedValue("unexpected");

      const result = await updateOrderAddresses("order-1", {});

      expect(result).toEqual({
        success: false,
        error: "Failed to update addresses",
      });
    });
  });

  describe("updateOrderMarket", () => {
    it("returns success with updated order", async () => {
      const updatedOrder = { ...mockOrder, currency: "EUR", locale: "de" };
      mockUpdateOrder.mockResolvedValue(updatedOrder);

      const result = await updateOrderMarket("order-1", {
        currency: "EUR",
        locale: "de",
      });

      expect(mockUpdateOrder).toHaveBeenCalledWith("order-1", {
        currency: "EUR",
        locale: "de",
      });
      expect(result).toEqual({ success: true, order: updatedOrder });
    });

    it("returns error on failure", async () => {
      mockUpdateOrder.mockRejectedValue(new Error("Currency not supported"));

      const result = await updateOrderMarket("order-1", {
        currency: "XYZ",
        locale: "en",
      });

      expect(result).toEqual({
        success: false,
        error: "Currency not supported",
      });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockUpdateOrder.mockRejectedValue("unexpected");

      const result = await updateOrderMarket("order-1", {
        currency: "EUR",
        locale: "de",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to update order market",
      });
    });
  });

  describe("advanceCheckout", () => {
    it("returns success with order", async () => {
      mockAdvance.mockResolvedValue(mockOrder);

      const result = await advanceCheckout("order-1");

      expect(mockAdvance).toHaveBeenCalledWith("order-1");
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("returns error on failure", async () => {
      mockAdvance.mockRejectedValue(new Error("Cannot advance"));

      const result = await advanceCheckout("order-1");

      expect(result).toEqual({
        success: false,
        error: "Cannot advance",
      });
    });
  });

  describe("getShipments", () => {
    it("returns shipment data on success", async () => {
      mockGetShipments.mockResolvedValue({ data: mockShipments });

      const result = await getShipments("order-1");

      expect(mockGetShipments).toHaveBeenCalledWith("order-1");
      expect(result).toBe(mockShipments);
    });

    it("returns empty array on failure", async () => {
      mockGetShipments.mockRejectedValue(new Error("Not found"));

      const result = await getShipments("order-1");

      expect(result).toEqual([]);
    });
  });

  describe("selectShippingRate", () => {
    it("returns success", async () => {
      mockSelectShippingRate.mockResolvedValue(undefined);

      const result = await selectShippingRate("order-1", "ship-1", "rate-1");

      expect(mockSelectShippingRate).toHaveBeenCalledWith(
        "order-1",
        "ship-1",
        "rate-1",
      );
      expect(result).toEqual({ success: true });
    });

    it("returns error on failure", async () => {
      mockSelectShippingRate.mockRejectedValue(new Error("Rate not available"));

      const result = await selectShippingRate("order-1", "ship-1", "rate-1");

      expect(result).toEqual({
        success: false,
        error: "Rate not available",
      });
    });
  });

  describe("applyCouponCode", () => {
    it("returns success with order", async () => {
      mockApplyCoupon.mockResolvedValue(mockOrder);

      const result = await applyCouponCode("order-1", "SAVE10");

      expect(mockApplyCoupon).toHaveBeenCalledWith("order-1", "SAVE10");
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("returns error on failure", async () => {
      mockApplyCoupon.mockRejectedValue(new Error("Coupon expired"));

      const result = await applyCouponCode("order-1", "EXPIRED");

      expect(result).toEqual({
        success: false,
        error: "Coupon expired",
      });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockApplyCoupon.mockRejectedValue("unexpected");

      const result = await applyCouponCode("order-1", "BAD");

      expect(result).toEqual({
        success: false,
        error: "Failed to apply coupon code",
      });
    });
  });

  describe("removeCouponCode", () => {
    it("returns success with order", async () => {
      mockRemoveCoupon.mockResolvedValue(mockOrder);

      const result = await removeCouponCode("order-1", "promo-1");

      expect(mockRemoveCoupon).toHaveBeenCalledWith("order-1", "promo-1");
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("returns error on failure", async () => {
      mockRemoveCoupon.mockRejectedValue(new Error("Promotion not found"));

      const result = await removeCouponCode("order-1", "promo-1");

      expect(result).toEqual({
        success: false,
        error: "Promotion not found",
      });
    });
  });

  describe("completeOrder", () => {
    it("returns success with order", async () => {
      mockComplete.mockResolvedValue(mockOrder);

      const result = await completeOrder("order-1");

      expect(mockComplete).toHaveBeenCalledWith("order-1");
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("returns error on failure", async () => {
      mockComplete.mockRejectedValue(new Error("Payment required"));

      const result = await completeOrder("order-1");

      expect(result).toEqual({
        success: false,
        error: "Payment required",
      });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockComplete.mockRejectedValue("unexpected");

      const result = await completeOrder("order-1");

      expect(result).toEqual({
        success: false,
        error: "Failed to complete order",
      });
    });
  });
});
