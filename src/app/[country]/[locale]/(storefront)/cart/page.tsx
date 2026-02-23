"use client";

import type { StoreLineItem } from "@spree/sdk";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ShoppingBagIcon } from "@/components/icons";
import { useCart } from "@/contexts/CartContext";
import { trackRemoveFromCart, trackViewCart } from "@/lib/analytics/gtm";
import { extractBasePath } from "@/lib/utils/path";

export default function CartPage() {
  const { cart, loading, updateItem, removeItem } = useCart();
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const viewCartFiredRef = useRef(false);

  // Track view_cart when cart loads with items
  useEffect(() => {
    if (!loading && cart && cart.item_count > 0 && !viewCartFiredRef.current) {
      trackViewCart(cart);
      viewCartFiredRef.current = true;
    }
  }, [cart, loading]);

  const handleRemove = async (item: StoreLineItem) => {
    await removeItem(item.id);
    if (cart) {
      trackRemoveFromCart(item, cart.currency);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cart || !cart.line_items || cart.line_items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <ShoppingBagIcon
            className="w-24 h-24 text-gray-300"
            strokeWidth={1}
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Your cart is empty
          </h1>
          <p className="mt-2 text-gray-500">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
          <Link
            href={`${basePath}/products`}
            className="mt-6 inline-block bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {cart.line_items.map((item) => (
              <div key={item.id} className="p-6 flex gap-6">
                {/* Image */}
                <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={item.thumbnail_url || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {item.name}
                  </h3>
                  {item.options_text && (
                    <p className="mt-1 text-sm text-gray-500">
                      {item.options_text}
                    </p>
                  )}
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {item.display_price}
                  </p>
                </div>

                {/* Quantity & Actions */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center border border-gray-300 rounded">
                    <button
                      onClick={() =>
                        updateItem(item.id, Math.max(1, item.quantity - 1))
                      }
                      className="px-3 py-1 text-gray-600 hover:text-gray-900"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="px-3 py-1 text-gray-600 hover:text-gray-900"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>

            <dl className="mt-6 space-y-4">
              <div className="flex justify-between">
                <dt className="text-gray-500">Subtotal</dt>
                <dd className="text-gray-900">{cart.display_item_total}</dd>
              </div>
              {cart.promo_total && parseFloat(cart.promo_total) < 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>Discount</dt>
                  <dd>{cart.display_promo_total}</dd>
                </div>
              )}
              {cart.ship_total && parseFloat(cart.ship_total) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Shipping</dt>
                  <dd className="text-gray-900">{cart.display_ship_total}</dd>
                </div>
              )}
              {cart.tax_total && parseFloat(cart.tax_total) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tax</dt>
                  <dd className="text-gray-900">{cart.display_tax_total}</dd>
                </div>
              )}
              <div className="border-t pt-4 flex justify-between">
                <dt className="text-lg font-medium text-gray-900">Total</dt>
                <dd className="text-lg font-bold text-gray-900">
                  {cart.display_total}
                </dd>
              </div>
            </dl>

            <Link
              href={`${basePath}/checkout/${cart.id}`}
              className="mt-6 block w-full bg-primary-500 text-white text-center py-3 px-6 rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              Proceed to Checkout
            </Link>

            <Link
              href={`${basePath}/products`}
              className="mt-4 block w-full text-center text-primary-500 hover:text-primary-700 font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
