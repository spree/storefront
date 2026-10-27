"use server";

import type { Cart, CreateCartParams } from "@spree/sdk";
import { updateTag } from "next/cache";
import {
  cacheTagSuffix,
  clearCartCookies,
  DEFAULT_SURFACE,
  getAccessToken,
  getCartId,
  getCartOptions,
  getCartToken,
  getClientForSurface,
  getLocaleOptions,
  isPoisonedDtcCartId,
  requireCartId,
  type Surface,
  setCartCookies,
} from "@/lib/spree";
import { actionResult } from "./utils";

/** Cache tag for a surface's cart, so DTC and wholesale carts invalidate independently. */
function cartTag(surface: Surface): string {
  return `cart${cacheTagSuffix(surface)}`;
}

/**
 * Whether a cart belongs to the given surface's sales channel. Cross-surface
 * isolation guard: a cart carries the channel it was created on (`channel_id`),
 * and each surface only shows its own channel's cart. Prevents a cart-id cookie
 * that was poisoned with another surface's cart (see getCart) from resurrecting
 * that cart via the intentionally cross-channel `carts.get` endpoint.
 *
 * Returns true when the cart's channel is unknown (null) or matches — i.e. only
 * a *confirmed* mismatch rejects, so this never hides a legitimate cart.
 */
async function cartBelongsToSurface(
  cart: Cart,
  surface: Surface,
): Promise<boolean> {
  if (!cart.channel_id) return true; // channel unknown — can't reject

  try {
    const channel = await getClientForSurface(surface).channel.get();
    return channel.id === cart.channel_id;
  } catch {
    // Channel lookup failed (transient) — don't reject on an unknown.
    return true;
  }
}

/**
 * Get the current cart for a surface. Returns null if no cart exists.
 */
export async function getCart(
  explicitCartId?: string,
  surface: Surface = DEFAULT_SURFACE,
): Promise<Cart | null> {
  const spreeToken = await getCartToken(surface);
  const token = await getAccessToken();
  const cartId = explicitCartId ?? (await getCartId(surface));
  const client = getClientForSurface(surface);

  if (!cartId && !token) return null;

  try {
    if (cartId) {
      // Guard the cookie-derived cart against cross-surface poisoning. Skipped
      // for an explicit cartId (the shared checkout resolves surface itself and
      // legitimately reads a cart by id across channels).
      if (!explicitCartId && (await isPoisonedDtcCartId(cartId, surface))) {
        await dropSurfaceCartCookies(surface);
        return null;
      }

      const cart = await client.carts.get(cartId, { spreeToken, token });

      if (!explicitCartId && !(await cartBelongsToSurface(cart, surface))) {
        await dropSurfaceCartCookies(surface);
        return null;
      }

      return cart;
    }

    // Authenticated user without stored cart ID — find their most recent cart.
    // carts.list is channel-scoped on the backend, so this only returns carts
    // for the surface's channel; still verify before adopting into the cookie.
    if (token) {
      const response = await client.carts.list({ token });
      if (response.data.length > 0) {
        const cart = response.data[0];
        if (!(await cartBelongsToSurface(cart, surface))) return null;
        await setCartCookies(cart.id, cart.token, surface);
        return cart;
      }
    }

    return null;
  } catch {
    // Cart not found (e.g., order was completed) — clear stale cookies.
    // Wrapped in try/catch because clearCartCookies sets cookies, which
    // is not allowed in Server Components (only in Server Actions).
    if (!explicitCartId) {
      await dropSurfaceCartCookies(surface);
    }
    return null;
  }
}

/** Best-effort cookie clear (cookies aren't writable during a Server Component render). */
async function dropSurfaceCartCookies(surface: Surface): Promise<void> {
  try {
    await clearCartCookies(surface);
  } catch {
    // Ignore — cookie clearing is best-effort
  }
}

/**
 * Get existing cart or create a new one on a surface. Wholesale carts are
 * created through the wholesale client so the order attributes to the wholesale
 * channel and inherits its no-guest-checkout rule.
 */
export async function getOrCreateCart(
  params?: CreateCartParams,
  surface: Surface = DEFAULT_SURFACE,
): Promise<Cart> {
  const existing = await getCart(undefined, surface);
  if (existing) return existing;

  const token = await getAccessToken();
  const localeOptions = await getLocaleOptions();
  const cartParams =
    params && Object.keys(params).length > 0 ? params : undefined;
  const cart = await getClientForSurface(surface).carts.create(cartParams, {
    ...localeOptions,
    ...(token ? { token } : undefined),
  });

  await setCartCookies(cart.id, cart.token, surface);

  updateTag(cartTag(surface));
  return cart;
}

export async function clearCart(surface: Surface = DEFAULT_SURFACE) {
  return actionResult(async () => {
    await clearCartCookies(surface);
    updateTag(cartTag(surface));
    return {};
  }, "Failed to clear cart");
}

export async function addToCart(
  variantId: string,
  quantity: number,
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    const cart = await getOrCreateCart(undefined, surface);
    const spreeToken = await getCartToken(surface);
    const token = await getAccessToken();

    const updatedCart = await getClientForSurface(surface).carts.items.create(
      cart.id,
      { variant_id: variantId, quantity },
      { spreeToken, token },
    );

    updateTag(cartTag(surface));
    return { cart: updatedCart };
  }, "Failed to add item to cart");
}

export async function updateCartItem(
  lineItemId: string,
  quantity: number,
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    const options = await getCartOptions(surface);
    const cartId = await requireCartId(surface);

    const cart = await getClientForSurface(surface).carts.items.update(
      cartId,
      lineItemId,
      { quantity },
      options,
    );

    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to update cart item");
}

export async function removeCartItem(
  lineItemId: string,
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    const options = await getCartOptions(surface);
    const cartId = await requireCartId(surface);

    const cart = await getClientForSurface(surface).carts.items.delete(
      cartId,
      lineItemId,
      options,
    );

    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to remove cart item");
}

export async function associateCartWithUser(
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    const spreeToken = await getCartToken(surface);
    const token = await getAccessToken();
    const cartId = await getCartId(surface);
    if (!cartId || !token) return {};

    try {
      await getClientForSurface(surface).carts.associate(cartId, {
        spreeToken,
        token,
      });
      updateTag(cartTag(surface));
    } catch {
      // Cart might already belong to another user — clear it
      await clearCartCookies(surface);
      updateTag(cartTag(surface));
    }
    return {};
  }, "Failed to associate cart");
}

/**
 * Says who this basket is for. Standing is enforced server-side — a cart
 * cannot name a company its buyer may not act for — so a refused id comes back
 * as a failed result rather than being silently ignored.
 *
 * Passing null returns the basket to a personal purchase, dropping the
 * company's catalog, pricing and tax anchoring with it.
 */
export async function setCartCompany(
  cartId: string,
  companyId: string | null,
  surface: Surface = DEFAULT_SURFACE,
) {
  return actionResult(async () => {
    const spreeToken = await getCartToken(surface);
    const cart = await getClientForSurface(surface).carts.update(
      cartId,
      { company_id: companyId },
      { spreeToken },
    );
    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to set the company for this cart");
}
