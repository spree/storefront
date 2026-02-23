"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  CloseIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
} from "@/components/icons";
import { useCart } from "@/contexts/CartContext";
import { trackRemoveFromCart, trackViewCart } from "@/lib/analytics/gtm";
import { extractBasePath } from "@/lib/utils/path";

export function CartDrawer() {
  const {
    cart,
    loading,
    updating,
    isOpen,
    closeCart,
    updateItem,
    removeItem,
    itemCount,
  } = useCart();
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const drawerRef = useRef<HTMLDivElement>(null);
  const viewCartFiredRef = useRef(false);
  const prevPathnameRef = useRef(pathname);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  // Close when navigating
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      closeCart();
    }
  }, [pathname, closeCart]);

  // Track view_cart when drawer opens with items (fire once per open)
  useEffect(() => {
    if (isOpen && cart && cart.item_count > 0 && !viewCartFiredRef.current) {
      trackViewCart(cart);
      viewCartFiredRef.current = true;
    }
    if (!isOpen) {
      viewCartFiredRef.current = false;
    }
  }, [isOpen, cart]);

  if (!isOpen) return null;

  const lineItems = cart?.line_items || [];
  const isEmpty = lineItems.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-md bg-white shadow-xl flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={closeCart}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close cart"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold uppercase">Cart</h2>
          <div className="relative w-6 h-6">
            <ShoppingBagIcon className="w-6 h-6 text-gray-600" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-24 h-24 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <ShoppingBagIcon
                className="w-16 h-16 text-gray-300 mb-4"
                strokeWidth={1}
              />
              <p className="text-gray-500 mb-4">Your cart is empty</p>
              <Link
                href={`${basePath}/products`}
                className="text-primary-500 hover:text-primary-700 font-medium"
                onClick={closeCart}
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {lineItems.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link
                      href={`${basePath}/products/${item.slug}`}
                      className="relative w-24 h-24 bg-gray-100 rounded overflow-hidden flex-shrink-0"
                      onClick={closeCart}
                    >
                      <Image
                        src={item.thumbnail_url || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <Link
                          href={`${basePath}/products/${item.slug}`}
                          className="font-medium text-gray-900 hover:text-primary-500 line-clamp-2"
                          onClick={closeCart}
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={async () => {
                            await removeItem(item.id);
                            if (cart) {
                              trackRemoveFromCart(item, cart.currency);
                            }
                          }}
                          disabled={updating}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                          aria-label="Remove item"
                        >
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="mt-1 text-sm">
                        {item.compare_at_amount &&
                        parseFloat(item.compare_at_amount) >
                          parseFloat(item.price) ? (
                          <>
                            <span className="text-gray-400 line-through mr-2">
                              {item.display_compare_at_amount}
                            </span>
                            <span className="text-red-600 font-medium">
                              {item.display_price}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-900">
                            {item.display_price}
                          </span>
                        )}
                      </div>

                      {/* Options */}
                      {item.options_text && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.options_text}
                        </p>
                      )}

                      {/* Quantity */}
                      <div className="mt-3 flex items-center">
                        <div className="flex items-center border border-gray-300 rounded">
                          <button
                            onClick={() =>
                              updateItem(
                                item.id,
                                Math.max(1, item.quantity - 1),
                              )
                            }
                            disabled={updating || item.quantity <= 1}
                            className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon className="w-3 h-3" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateItem(item.id, item.quantity + 1)
                            }
                            disabled={updating}
                            className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            <PlusIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && !loading && (
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* Summary */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500 text-center">
                Shipping and taxes calculated at checkout
              </p>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span>{cart?.display_item_total}</span>
              </div>
              {cart?.promo_total && parseFloat(cart.promo_total) < 0 && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>Discount</span>
                  <span>{cart.display_promo_total}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Link
                href={`${basePath}/checkout/${cart?.id}`}
                className="block w-full bg-primary-500 text-white text-center py-3 px-4 rounded-xl font-medium hover:bg-primary-700 transition-colors"
                onClick={closeCart}
              >
                Checkout
              </Link>
              <Link
                href={`${basePath}/cart`}
                className="block w-full text-center text-primary-500 hover:text-primary-700 font-medium py-2"
                onClick={closeCart}
              >
                View Cart
              </Link>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {updating && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
