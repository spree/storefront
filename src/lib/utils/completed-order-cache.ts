import type { Order, OrderGroup } from "@spree/sdk";

/**
 * Client-side cache for completed order data using sessionStorage.
 *
 * When `POST /carts/:id/complete` returns the result, we store it here
 * so the thank-you page can display it immediately without re-fetching.
 * Falls back to API on page refresh.
 *
 * The completion answers with an Order, or — when a marketplace cart spanned
 * several sellers — with the OrderGroup it was split into. The cache stores
 * whichever came back, keyed by the cart ID used to complete.
 */

export type CompletedCheckout = Order | OrderGroup;

const STORAGE_KEY_PREFIX = "spree_completed_order_";

export function cacheCompletedOrder(
  cartId: string,
  order: CompletedCheckout,
): void {
  try {
    sessionStorage.setItem(
      `${STORAGE_KEY_PREFIX}${cartId}`,
      JSON.stringify(order),
    );
  } catch {
    // sessionStorage unavailable (SSR, private browsing quota) — ignore
  }
}

export function getCachedCompletedOrder(
  cartId: string,
): CompletedCheckout | null {
  try {
    const data = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${cartId}`);
    if (!data) return null;

    // Remove after reading — one-time use
    sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${cartId}`);
    return JSON.parse(data) as CompletedCheckout;
  } catch {
    return null;
  }
}
