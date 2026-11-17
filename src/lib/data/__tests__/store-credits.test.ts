import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  carts: {
    storeCredits: {
      apply: vi.fn(),
      remove: vi.fn(),
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

const { getCustomer } = vi.hoisted(() => ({ getCustomer: vi.fn() }));
vi.mock("@/lib/data/customer", () => ({ getCustomer }));

import {
  applyStoreCredit,
  getStoreCreditBalance,
  removeStoreCredit,
} from "@/lib/data/store-credits";

const options = { spreeToken: "order-token-123", token: undefined };

describe("store credit server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStoreCreditBalance", () => {
    it("returns the customer's spendable balance", async () => {
      getCustomer.mockResolvedValue({
        id: "cust-1",
        available_store_credit_total: "50.0",
        display_available_store_credit_total: "$50.00",
      });

      expect(await getStoreCreditBalance()).toEqual({
        amount: 50,
        displayAmount: "$50.00",
      });
    });

    it("returns null for guests", async () => {
      getCustomer.mockResolvedValue(null);

      expect(await getStoreCreditBalance()).toBeNull();
    });

    it("returns null when the balance is not a number", async () => {
      getCustomer.mockResolvedValue({
        id: "cust-1",
        available_store_credit_total: null,
        display_available_store_credit_total: null,
      });

      expect(await getStoreCreditBalance()).toBeNull();
    });
  });

  describe("applyStoreCredit", () => {
    it("returns the updated cart", async () => {
      const coveredCart = {
        id: "cart-1",
        amount_due: "0.0",
        covered_by_store_credit: true,
      };
      mockClient.carts.storeCredits.apply.mockResolvedValue(coveredCart);

      const result = await applyStoreCredit("cart-1");

      // No amount — draws the whole outstanding balance, across as many
      // credits as it takes.
      expect(mockClient.carts.storeCredits.apply).toHaveBeenCalledWith(
        "cart-1",
        undefined,
        options,
      );
      expect(result).toEqual({ success: true, cart: coveredCart });
    });

    it("reports a balance the credit did not cover", async () => {
      mockClient.carts.storeCredits.apply.mockResolvedValue({
        id: "cart-1",
        amount_due: "25.0",
        display_amount_due: "$25.00",
        covered_by_store_credit: false,
      });

      const result = await applyStoreCredit("cart-1");

      expect(result.success).toBe(true);
      expect(result.success && result.cart.covered_by_store_credit).toBe(false);
      expect(result.success && result.cart.display_amount_due).toBe("$25.00");
    });

    it("returns error on failure", async () => {
      mockClient.carts.storeCredits.apply.mockRejectedValue(
        new Error("User does not have any Store Credits available"),
      );

      const result = await applyStoreCredit("cart-1");

      expect(result).toEqual({
        success: false,
        error: "User does not have any Store Credits available",
      });
    });
  });

  describe("removeStoreCredit", () => {
    it("returns the cart with the credit released", async () => {
      const restoredCart = {
        id: "cart-1",
        amount_due: "75.0",
        store_credit_total: "0.0",
        covered_by_store_credit: false,
      };
      mockClient.carts.storeCredits.remove.mockResolvedValue(restoredCart);

      const result = await removeStoreCredit("cart-1");

      expect(mockClient.carts.storeCredits.remove).toHaveBeenCalledWith(
        "cart-1",
        options,
      );
      expect(result).toEqual({ success: true, cart: restoredCart });
    });

    it("returns error on failure", async () => {
      mockClient.carts.storeCredits.remove.mockRejectedValue(
        new Error("Nothing to remove"),
      );

      const result = await removeStoreCredit("cart-1");

      expect(result).toEqual({ success: false, error: "Nothing to remove" });
    });
  });
});
