"use client";

import type { StoreLineItem, StoreOrder } from "@spree/sdk";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  addToCart as addToCartAction,
  getCart as getCartAction,
  removeCartItem as removeCartItemAction,
  updateCartItem as updateCartItemAction,
} from "@/lib/data/cart";

interface CartContextType {
  cart: StoreOrder | null;
  loading: boolean;
  updating: boolean;
  itemCount: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const refreshCart = useCallback(async () => {
    try {
      const cartData = await getCartAction();
      setCart(cartData);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const mutateCart = useCallback(
    async (
      action: () => Promise<{
        success: boolean;
        cart?: StoreOrder | null;
        error?: string;
      }>,
      errorLabel: string,
      onSuccess?: () => void,
    ) => {
      setUpdating(true);
      try {
        const result = await action();
        if (result.success) {
          setCart(result.cart ?? null);
          onSuccess?.();
          router.refresh();
        } else {
          console.error(`Failed to ${errorLabel}:`, result.error);
        }
      } catch (error) {
        console.error(`Failed to ${errorLabel}:`, error);
      } finally {
        setUpdating(false);
      }
    },
    [router],
  );

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      await mutateCart(
        () => addToCartAction(variantId, quantity),
        "add item to cart",
        () => setIsOpen(true),
      );
    },
    [mutateCart],
  );

  const updateItem = useCallback(
    async (lineItemId: string, quantity: number) => {
      await mutateCart(
        () => updateCartItemAction(lineItemId, quantity),
        "update cart item",
      );
    },
    [mutateCart],
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      await mutateCart(
        () => removeCartItemAction(lineItemId),
        "remove cart item",
      );
    },
    [mutateCart],
  );

  // Re-fetch cart on navigation (e.g., after checkout completes, the stale
  // cart token will be cleared by getCart and the cart state will update).
  // On the order-placed page, skip refreshCart to avoid a race condition:
  // getCart() auto-clears the cart token cookie on error (completed order
  // is no longer a cart), which removes the only auth token guest users
  // have before getCheckoutOrder() can use it.
  useEffect(() => {
    if (pathname.includes("/order-placed/")) {
      setCart(null);
      setLoading(false);
      return;
    }
    refreshCart();
  }, [refreshCart, pathname]);

  const itemCount =
    cart?.line_items?.reduce(
      (sum: number, item: StoreLineItem) => sum + item.quantity,
      0,
    ) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        updating,
        itemCount,
        isOpen,
        openCart,
        closeCart,
        addItem,
        updateItem,
        removeItem,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
