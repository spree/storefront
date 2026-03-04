import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@spree/next", () => ({
  getCart: vi.fn(),
  getOrCreateCart: vi.fn(),
  clearCart: vi.fn(),
  addItem: vi.fn(),
  associateCart: vi.fn(),
  removeItem: vi.fn(),
  updateItem: vi.fn(),
}));

import {
  addItem,
  associateCart,
  clearCart as clearCartSdk,
  getCart as getCartSdk,
  getOrCreateCart as getOrCreateCartSdk,
  removeItem,
  updateItem,
} from "@spree/next";

import {
  addToCart,
  associateCartWithUser,
  clearCart,
  getCart,
  getOrCreateCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/data/cart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixtures are intentionally partial
const mockGetCart = getCartSdk as any;
const mockGetOrCreateCart = getOrCreateCartSdk as any;
const mockAddItem = addItem as any;
const mockUpdateItem = updateItem as any;
const mockRemoveItem = removeItem as any;
const mockClearCart = clearCartSdk as any;
const mockAssociateCart = associateCart as any;

// Minimal cart fixture for tests
const mockCart = {
  id: "cart-1",
  number: "R123456",
  state: "cart",
  token: "order-token-123",
  line_items: [],
  total: "0.00",
};

describe("cart server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCart", () => {
    it("delegates to @spree/next getCart", async () => {
      mockGetCart.mockResolvedValue(mockCart);
      const result = await getCart();
      expect(mockGetCart).toHaveBeenCalledOnce();
      expect(result).toBe(mockCart);
    });
  });

  describe("getOrCreateCart", () => {
    it("delegates to @spree/next getOrCreateCart", async () => {
      mockGetOrCreateCart.mockResolvedValue(mockCart);
      const result = await getOrCreateCart();
      expect(mockGetOrCreateCart).toHaveBeenCalledOnce();
      expect(result).toBe(mockCart);
    });
  });

  describe("addToCart", () => {
    it("returns success with cart", async () => {
      mockAddItem.mockResolvedValue(mockCart);

      const result = await addToCart("variant-1", 2);

      expect(mockAddItem).toHaveBeenCalledWith("variant-1", 2);
      expect(result).toEqual({ success: true, cart: mockCart });
    });

    it("returns error when addItem throws", async () => {
      mockAddItem.mockRejectedValue(new Error("Variant not found"));

      const result = await addToCart("bad-variant", 1);

      expect(result).toEqual({
        success: false,
        error: "Variant not found",
      });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockAddItem.mockRejectedValue("unexpected");

      const result = await addToCart("variant-1", 1);

      expect(result).toEqual({
        success: false,
        error: "Failed to add item to cart",
      });
    });
  });

  describe("updateCartItem", () => {
    it("returns success with refreshed cart", async () => {
      mockUpdateItem.mockResolvedValue(mockCart);

      const result = await updateCartItem("li-1", 3);

      expect(mockUpdateItem).toHaveBeenCalledWith("li-1", { quantity: 3 });
      expect(result).toEqual({ success: true, cart: mockCart });
    });

    it("returns error on failure", async () => {
      mockUpdateItem.mockRejectedValue(new Error("Insufficient stock"));

      const result = await updateCartItem("li-1", 999);

      expect(result).toEqual({
        success: false,
        error: "Insufficient stock",
      });
    });
  });

  describe("removeCartItem", () => {
    it("returns success with refreshed cart", async () => {
      mockRemoveItem.mockResolvedValue(mockCart);

      const result = await removeCartItem("li-1");

      expect(mockRemoveItem).toHaveBeenCalledWith("li-1");
      expect(result).toEqual({ success: true, cart: mockCart });
    });

    it("returns error on failure", async () => {
      mockRemoveItem.mockRejectedValue(new Error("Item not found"));

      const result = await removeCartItem("li-999");

      expect(result).toEqual({
        success: false,
        error: "Item not found",
      });
    });
  });

  describe("clearCart", () => {
    it("returns success", async () => {
      mockClearCart.mockResolvedValue(undefined);

      const result = await clearCart();

      expect(result).toEqual({ success: true });
    });

    it("returns error on failure", async () => {
      mockClearCart.mockRejectedValue(new Error("Server error"));

      const result = await clearCart();

      expect(result).toEqual({ success: false, error: "Server error" });
    });
  });

  describe("associateCartWithUser", () => {
    it("returns success", async () => {
      mockAssociateCart.mockResolvedValue({});

      const result = await associateCartWithUser();

      expect(result).toEqual({ success: true });
    });

    it("returns fallback message for non-Error throws", async () => {
      mockAssociateCart.mockRejectedValue("unexpected");

      const result = await associateCartWithUser();

      expect(result).toEqual({
        success: false,
        error: "Failed to associate cart",
      });
    });
  });
});
