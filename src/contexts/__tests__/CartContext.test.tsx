import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/cart", () => ({
  getCart: vi.fn(),
  addToCart: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { toast } from "sonner";
import { CartProvider, useCart } from "@/contexts/CartContext";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/data/cart";

const mockGetCart = vi.mocked(getCart);
const mockAddToCart = vi.mocked(addToCart);
const mockUpdateCartItem = vi.mocked(updateCartItem);
const mockRemoveCartItem = vi.mocked(removeCartItem);
const mockToastError = vi.mocked(toast.error);

const mockCart = {
  id: "cart-1",
  items: [
    { id: "li-1", quantity: 2, name: "Shirt" },
    { id: "li-2", quantity: 1, name: "Pants" },
  ],
} as never;

const updatedCart = {
  id: "cart-1",
  items: [
    { id: "li-1", quantity: 2, name: "Shirt" },
    { id: "li-2", quantity: 1, name: "Pants" },
    { id: "li-3", quantity: 1, name: "Hat" },
  ],
} as never;

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

describe("CartContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCart.mockResolvedValue(mockCart);
  });

  it("throws when used outside CartProvider", () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow("useCart must be used within a CartProvider");
  });

  it("loads cart on mount", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetCart).toHaveBeenCalledOnce();
    expect(result.current.cart).toBe(mockCart);
  });

  it("computes itemCount from cart items", async () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.itemCount).toBe(3); // 2 + 1
  });

  it("sets cart to null when initial load fails", async () => {
    mockGetCart.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cart).toBeNull();
    expect(result.current.itemCount).toBe(0);
  });

  describe("addItem", () => {
    it("updates cart and opens drawer on success", async () => {
      mockAddToCart.mockResolvedValue({
        success: true as const,
        cart: updatedCart,
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addItem("variant-1", 2);
      });

      expect(mockAddToCart).toHaveBeenCalledWith(
        "variant-1",
        2,
        "dtc",
        undefined,
      );
      expect(result.current.cart).toBe(updatedCart);
      expect(result.current.isOpen).toBe(true);
      expect(result.current.updating).toBe(false);
    });

    it("shows error toast and does not update cart on failure", async () => {
      mockAddToCart.mockResolvedValue({
        success: false as const,
        error: "Out of stock",
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addItem("variant-1");
      });

      expect(result.current.cart).toBe(mockCart); // unchanged
      expect(mockToastError).toHaveBeenCalledWith("Out of stock");
    });

    it("shows fallback toast when server error message is empty", async () => {
      mockAddToCart.mockResolvedValue({
        success: false as const,
        error: "",
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addItem("variant-1");
      });

      expect(mockToastError).toHaveBeenCalledWith("failedToAddItem");
    });
  });

  describe("updateItem", () => {
    it("updates cart on success", async () => {
      mockUpdateCartItem.mockResolvedValue({
        success: true as const,
        cart: updatedCart,
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateItem("li-1", 5);
      });

      expect(mockUpdateCartItem).toHaveBeenCalledWith("li-1", 5, "dtc");
      expect(result.current.cart).toBe(updatedCart);
      expect(result.current.updating).toBe(false);
    });
  });

  describe("removeItem", () => {
    it("updates cart on success", async () => {
      const cartAfterRemoval = {
        id: "cart-1",
        items: [{ id: "li-2", quantity: 1, name: "Pants" }],
      } as never;

      mockRemoveCartItem.mockResolvedValue({
        success: true as const,
        cart: cartAfterRemoval,
      });

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeItem("li-1");
      });

      expect(mockRemoveCartItem).toHaveBeenCalledWith("li-1", "dtc");
      expect(result.current.cart).toBe(cartAfterRemoval);
      expect(result.current.itemCount).toBe(1);
    });
  });

  describe("openCart / closeCart", () => {
    it("toggles isOpen", async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.openCart();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeCart();
      });
      expect(result.current.isOpen).toBe(false);
    });
  });
});
