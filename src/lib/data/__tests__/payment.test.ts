import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  carts: {
    get: vi.fn(),
    list: vi.fn(),
    complete: vi.fn(),
    paymentSessions: {
      create: vi.fn(),
      complete: vi.fn(),
    },
  },
};

vi.mock("@/lib/spree", () => ({
  getClient: () => mockClient,
  getClientForSurface: () => mockClient,
  cacheTagSuffix: () => "",
  DEFAULT_SURFACE: "dtc",
  isWholesaleEnabled: vi.fn().mockReturnValue(false),
  getCartToken: vi.fn().mockResolvedValue("order-token-123"),
  getCartId: vi.fn().mockResolvedValue("cart-1"),
  getAccessToken: vi.fn().mockResolvedValue(undefined),
  setCartCookies: vi.fn(),
  clearCartCookies: vi.fn(),
  getCartOptions: vi.fn().mockResolvedValue({
    spreeToken: "order-token-123",
    token: undefined,
  }),
  requireCartId: vi.fn().mockResolvedValue("cart-1"),
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
}));

import {
  completeCheckoutOrder,
  completeCheckoutPaymentSession,
  confirmPaymentAndCompleteCart,
  createCheckoutPaymentSession,
} from "@/lib/data/payment";

const mockSession = {
  id: "session-1",
  status: "pending",
  external_data: { client_secret: "pi_secret_123" },
};

const mockOrder = {
  id: "cart-1",
  number: "R100",
  current_step: "complete",
};

describe("payment server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCheckoutPaymentSession", () => {
    it("returns success with session", async () => {
      mockClient.carts.paymentSessions.create.mockResolvedValue(mockSession);

      const result = await createCheckoutPaymentSession("cart-1", "pm-1");

      expect(mockClient.carts.paymentSessions.create).toHaveBeenCalledWith(
        "cart-1",
        { payment_method_id: "pm-1" },
        { spreeToken: "order-token-123", token: undefined },
      );
      expect(result).toEqual({ success: true, session: mockSession });
    });

    it("passes external_data when provided", async () => {
      mockClient.carts.paymentSessions.create.mockResolvedValue(mockSession);

      await createCheckoutPaymentSession("cart-1", "pm-1", {
        stripe_payment_method_id: "spm_123",
      });

      expect(mockClient.carts.paymentSessions.create).toHaveBeenCalledWith(
        "cart-1",
        {
          payment_method_id: "pm-1",
          external_data: { stripe_payment_method_id: "spm_123" },
        },
        { spreeToken: "order-token-123", token: undefined },
      );
    });

    it("returns error on failure", async () => {
      mockClient.carts.paymentSessions.create.mockRejectedValue(
        new Error("Gateway unavailable"),
      );

      const result = await createCheckoutPaymentSession("cart-1", "pm-1");

      expect(result).toEqual({
        success: false,
        error: "Gateway unavailable",
      });
    });
  });

  describe("completeCheckoutPaymentSession", () => {
    it("returns success with session", async () => {
      const completedSession = { ...mockSession, status: "completed" };
      mockClient.carts.paymentSessions.complete.mockResolvedValue(
        completedSession,
      );

      const result = await completeCheckoutPaymentSession(
        "cart-1",
        "session-1",
      );

      expect(mockClient.carts.paymentSessions.complete).toHaveBeenCalledWith(
        "cart-1",
        "session-1",
        undefined,
        { spreeToken: "order-token-123", token: undefined },
      );
      expect(result).toEqual({ success: true, session: completedSession });
    });

    it("returns error on failure", async () => {
      mockClient.carts.paymentSessions.complete.mockRejectedValue(
        new Error("Session expired"),
      );

      const result = await completeCheckoutPaymentSession(
        "cart-1",
        "session-1",
      );

      expect(result).toEqual({ success: false, error: "Session expired" });
    });
  });

  describe("completeCheckoutOrder", () => {
    it("returns success with order", async () => {
      mockClient.carts.complete.mockResolvedValue(mockOrder);

      const result = await completeCheckoutOrder("cart-1");

      expect(mockClient.carts.complete).toHaveBeenCalledWith("cart-1", {
        spreeToken: "order-token-123",
        token: undefined,
      });
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("treats 403 as success (order already completed)", async () => {
      const spreeError = Object.assign(new Error("Not authorized"), {
        status: 403,
      });
      mockClient.carts.complete.mockRejectedValue(spreeError);

      const result = await completeCheckoutOrder("cart-1");

      expect(result).toEqual({ success: true, order: null });
    });

    it("treats 422 as success (state_lock_version conflict)", async () => {
      const spreeError = Object.assign(new Error("Unprocessable Content"), {
        status: 422,
      });
      mockClient.carts.complete.mockRejectedValue(spreeError);

      const result = await completeCheckoutOrder("cart-1");

      expect(result).toEqual({ success: true, order: null });
    });

    it("returns error on non-403 failure", async () => {
      mockClient.carts.complete.mockRejectedValue(
        new Error("Payment required"),
      );

      const result = await completeCheckoutOrder("cart-1");

      expect(result).toEqual({ success: false, error: "Payment required" });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockClient.carts.complete.mockRejectedValue("unexpected");

      const result = await completeCheckoutOrder("cart-1");

      expect(result).toEqual({
        success: false,
        error: "Failed to complete order",
      });
    });
  });

  describe("confirmPaymentAndCompleteCart", () => {
    it("passes cartId to getCart for explicit lookup", async () => {
      mockClient.carts.get.mockResolvedValue({
        id: "cart-1",
        current_step: "complete",
      });

      await confirmPaymentAndCompleteCart("cart-1", "session-1");

      expect(mockClient.carts.get).toHaveBeenCalledWith("cart-1", {
        spreeToken: "order-token-123",
        token: undefined,
      });
    });

    it("succeeds when cart is already complete", async () => {
      mockClient.carts.get.mockResolvedValue({
        id: "cart-1",
        current_step: "complete",
      });

      const result = await confirmPaymentAndCompleteCart("cart-1", "session-1");

      expect(result).toEqual({
        success: true,
        order: { id: "cart-1", current_step: "complete" },
      });
      expect(mockClient.carts.paymentSessions.complete).not.toHaveBeenCalled();
      expect(mockClient.carts.complete).not.toHaveBeenCalled();
    });

    it("completes payment session then completes the order", async () => {
      mockClient.carts.get.mockResolvedValue({
        id: "cart-1",
        current_step: "payment",
      });
      mockClient.carts.paymentSessions.complete.mockResolvedValue({
        id: "session-1",
        status: "completed",
      });
      mockClient.carts.complete.mockResolvedValue(mockOrder);

      const result = await confirmPaymentAndCompleteCart("cart-1", "session-1");

      expect(mockClient.carts.paymentSessions.complete).toHaveBeenCalled();
      expect(mockClient.carts.complete).toHaveBeenCalledWith("cart-1", {
        spreeToken: "order-token-123",
        token: undefined,
      });
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("returns error when payment session fails", async () => {
      mockClient.carts.get.mockResolvedValue({
        id: "cart-1",
        current_step: "payment",
      });
      mockClient.carts.paymentSessions.complete.mockResolvedValue({
        id: "session-1",
        status: "failed",
      });

      const result = await confirmPaymentAndCompleteCart("cart-1", "session-1");

      expect(result).toEqual({
        success: false,
        error: "Payment was not successful. Please try again.",
      });
      expect(mockClient.carts.complete).not.toHaveBeenCalled();
    });

    it("skips session completion when no session ID provided", async () => {
      mockClient.carts.get.mockResolvedValue({
        id: "cart-1",
        current_step: "payment",
      });
      mockClient.carts.complete.mockResolvedValue(mockOrder);

      const result = await confirmPaymentAndCompleteCart("cart-1");

      expect(mockClient.carts.paymentSessions.complete).not.toHaveBeenCalled();
      expect(mockClient.carts.complete).toHaveBeenCalledWith("cart-1", {
        spreeToken: "order-token-123",
        token: undefined,
      });
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    it("returns success when cart is not found (already completed by webhook)", async () => {
      mockClient.carts.get.mockRejectedValue(new Error("Not found"));

      const result = await confirmPaymentAndCompleteCart("cart-1", "session-1");

      expect(mockClient.carts.complete).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, order: null });
    });

    it("returns error when complete throws non-403 error", async () => {
      mockClient.carts.get.mockResolvedValue({
        id: "cart-1",
        current_step: "payment",
      });
      mockClient.carts.complete.mockRejectedValue(
        new Error("Order cannot be completed"),
      );

      const result = await confirmPaymentAndCompleteCart("cart-1");

      expect(result).toEqual({
        success: false,
        error: "Order cannot be completed",
      });
    });

    it("treats 403 from complete as success (order already completed)", async () => {
      mockClient.carts.get.mockResolvedValue({
        id: "cart-1",
        current_step: "payment",
      });
      const spreeError = Object.assign(new Error("Not authorized"), {
        status: 403,
      });
      mockClient.carts.complete.mockRejectedValue(spreeError);

      const result = await confirmPaymentAndCompleteCart("cart-1");

      expect(result).toEqual({ success: true, order: null });
    });

    it("returns success when getCart throws (cart may have been completed)", async () => {
      mockClient.carts.get.mockRejectedValue("unexpected");

      const result = await confirmPaymentAndCompleteCart("cart-1");

      // getCart() returns null on error (clears stale cookies),
      // so confirmPaymentAndCompleteCart treats it as already completed
      expect(result).toEqual({ success: true, order: null });
    });
  });
});
