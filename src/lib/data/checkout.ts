"use server";

import type { AddressParams, Cart, Order } from "@spree/sdk";
import { SpreeError } from "@spree/sdk";
import { updateTag } from "next/cache";
import {
  cacheTagSuffix,
  getCartId,
  getCartOptions,
  getClientForSurface,
  isWholesaleEnabled,
  requireCartId,
  type Surface,
} from "@/lib/spree";
import { getCart } from "./cart";
import { getOrder } from "./orders";
import { actionResult, withFallback } from "./utils";
import { getWholesaleChannel } from "./wholesale";

/**
 * Determine which surface a checkout belongs to by matching its cart id against
 * the per-surface cart-id cookie. Cheap and correct for in-session actions,
 * where the cookie is always present. For the offsite-payment return path — where
 * the cookie may be gone — use {@link resolveSurfaceForCartVerified} instead.
 * Defaults to DTC when it matches neither.
 */
export async function resolveSurfaceForCart(cartId: string): Promise<Surface> {
  if (!isWholesaleEnabled()) return "dtc";
  const wholesaleCartId = await getCartId("wholesale");
  return wholesaleCartId === cartId ? "wholesale" : "dtc";
}

/**
 * Result of the verified surface resolution. `"unverified"` is distinct from
 * `"dtc"` on purpose: it means the wholesale check couldn't run to completion
 * (transient fetch/channel failure), so the surface is *unknown*, not confirmed
 * DTC. Callers on the offsite-payment path must fail closed on `"unverified"`
 * rather than routing a possibly-wholesale checkout through the DTC client.
 */
export type VerifiedSurface = Surface | "unverified";

/**
 * Like {@link resolveSurfaceForCart}, but confirms an ambiguous cart against its
 * own `channel_id` rather than trusting the cookie. Used on the offsite-payment
 * return, where the wholesale cart cookie can be dropped during the redirect and
 * a cookie-only check would route a wholesale checkout through the DTC client.
 * The extra fetch only runs when wholesale is enabled and the cookie didn't
 * already resolve the cart.
 *
 * Returns `"unverified"` when the wholesale lookup fails so the caller can fail
 * closed — a transient failure must not be mistaken for a confirmed DTC cart.
 */
export async function resolveSurfaceForCartVerified(
  cartId: string,
): Promise<VerifiedSurface> {
  if (!isWholesaleEnabled()) return "dtc";

  const wholesaleCartId = await getCartId("wholesale");
  if (wholesaleCartId === cartId) return "wholesale";

  // Cookie says DTC or is absent — verify against the cart's channel. Only a
  // *positive* signal decides the surface: a fetched cart whose channel matches
  // wholesale → "wholesale"; a fetched cart whose channel differs → confirmed
  // "dtc". Anything else (fetch threw, cart null, channel null) is "unverified"
  // so the caller fails closed instead of defaulting to DTC.
  try {
    const [cart, channel] = await Promise.all([
      getCart(cartId, "wholesale"),
      getWholesaleChannel(),
    ]);
    if (!cart || !channel) return "unverified";
    if (cart.channel_id == null) return "unverified";
    return cart.channel_id === channel.id ? "wholesale" : "dtc";
  } catch {
    return "unverified";
  }
}

/** Checkout cache tag, segmented per surface. */
function checkoutTag(surface: Surface): string {
  return `checkout${cacheTagSuffix(surface)}`;
}

function cartTag(surface: Surface): string {
  return `cart${cacheTagSuffix(surface)}`;
}

export async function getCheckoutOrder(cartId: string): Promise<Cart | null> {
  const surface = await resolveSurfaceForCart(cartId);

  // Try active cart first (order may still be in checkout)
  const cart = await getCart(undefined, surface);
  if (cart && cart.id === cartId) return cart;

  // Cart completed — fetch as completed order.
  return withFallback(
    async () => (await getOrder(cartId, undefined, surface)) as unknown as Cart,
    null,
  );
}

export async function getCompletedOrder(cartId: string): Promise<Cart | null> {
  const surface = await resolveSurfaceForCart(cartId);

  // Fetch order directly — used by the order-placed page.
  // Does not call getCart() first because getCart() auto-clears
  // the cart token cookie on failure, which breaks getOrder()
  // for guest users.
  return withFallback(
    async () => (await getOrder(cartId, undefined, surface)) as unknown as Cart,
    null,
  );
}

/**
 * Fetch the orders a split marketplace checkout produced — used by the
 * order-placed page after a refresh. The group they belong to can't be looked
 * up through the Store API (and `orders.get(cartId)` no longer resolves once
 * the cart completed into a group), but every child order carries the cart
 * token, so each resolves by its own id.
 */
export async function getCompletedOrders(
  cartId: string,
  orderIds: string[],
): Promise<Order[]> {
  const surface = await resolveSurfaceForCart(cartId);
  const orders = await Promise.all(
    orderIds.map((id) => getOrder(id, undefined, surface)),
  );
  return orders.filter((order): order is Order => order !== null);
}

export async function updateOrderAddresses(
  cartId: string,
  addresses: {
    shipping_address?: AddressParams;
    billing_address?: AddressParams;
    shipping_address_id?: string;
    billing_address_id?: string;
    use_shipping?: boolean;
    email?: string;
  },
) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const cart = await getClientForSurface(surface).carts.update(
      id,
      addresses,
      options,
    );
    updateTag(checkoutTag(surface));
    return { cart };
  }, "Failed to update addresses");
}

export async function updateCartMarket(
  cartId: string,
  params: { currency: string; locale: string },
) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const cart = await getClientForSurface(surface).carts.update(
      id,
      params,
      options,
    );
    updateTag(checkoutTag(surface));
    return { cart };
  }, "Failed to update order market");
}

export async function selectDeliveryRate(
  cartId: string,
  fulfillmentId: string,
  deliveryRateId: string,
) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const cart = await getClientForSurface(surface).carts.fulfillments.update(
      id,
      fulfillmentId,
      { selected_delivery_rate_id: deliveryRateId },
      options,
    );
    updateTag(checkoutTag(surface));
    return { cart };
  }, "Failed to select delivery rate");
}

/**
 * Apply a code to the cart — tries discount code first, then gift card.
 * Single input field on checkout, backend determines the type.
 */
export async function applyCode(cartId: string, code: string) {
  const surface = await resolveSurfaceForCart(cartId);
  const options = await getCartOptions(surface);
  const id = await requireCartId(surface);
  const client = getClientForSurface(surface);

  // Try discount code first (more common)
  try {
    const cart = await client.carts.discountCodes.apply(id, code, options);
    updateTag(checkoutTag(surface));
    updateTag(cartTag(surface));
    return { success: true, cart, type: "discount" as const };
  } catch (discountError) {
    // Only fall back to gift card if the discount code was not found (422/404).
    // Network errors, 500s, etc. should surface the backend message directly.
    const isNotFound =
      discountError instanceof SpreeError &&
      (discountError.status === 422 || discountError.status === 404);

    if (!isNotFound) {
      return { success: false, error: errorMessage(discountError) } as const;
    }

    // Discount code not found — try gift card
    try {
      const cart = await client.carts.giftCards.apply(id, code, options);
      updateTag(checkoutTag(surface));
      updateTag(cartTag(surface));
      return { success: true, cart, type: "gift_card" as const };
    } catch (giftCardError) {
      // Gift card also failed. If it's a specific error (expired, redeemed, etc.)
      // show the backend message. If both are just "not found", show the
      // discount error (the more common scenario).
      const isGiftCardNotFound =
        giftCardError instanceof SpreeError &&
        (giftCardError.code === "gift_card_not_found" ||
          giftCardError.code === "record_not_found");

      return {
        success: false,
        error: isGiftCardNotFound
          ? errorMessage(discountError)
          : errorMessage(giftCardError),
      } as const;
    }
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "The entered code is not valid";
}

export async function removeDiscountCode(cartId: string, code: string) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const cart = await getClientForSurface(surface).carts.discountCodes.remove(
      id,
      code,
      options,
    );
    updateTag(checkoutTag(surface));
    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to remove discount code");
}

export async function removeGiftCard(cartId: string, giftCardId: string) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const cart = await getClientForSurface(surface).carts.giftCards.remove(
      id,
      giftCardId,
      options,
    );
    updateTag(checkoutTag(surface));
    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to remove gift card");
}
