"use server";

import type { Order, OrderGroup } from "@spree/sdk";
import { updateTag } from "next/cache";
import {
  cacheTagSuffix,
  getCartOptions,
  getClientForSurface,
  requireCartId,
  type Surface,
} from "@/lib/spree";
import { getCart } from "./cart";
import {
  resolveSurfaceForCart,
  resolveSurfaceForCartVerified,
} from "./checkout";
import { getOrder } from "./orders";
import { actionResult } from "./utils";

function checkoutTag(surface: Surface): string {
  return `checkout${cacheTagSuffix(surface)}`;
}

function cartTag(surface: Surface): string {
  return `cart${cacheTagSuffix(surface)}`;
}

export async function createCheckoutPaymentSession(
  cartId: string,
  paymentMethodId: string,
  externalData?: Record<string, unknown>,
) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const session = await getClientForSurface(
      surface,
    ).carts.paymentSessions.create(
      id,
      {
        payment_method_id: paymentMethodId,
        ...(externalData && { external_data: externalData }),
      },
      options,
    );
    updateTag(checkoutTag(surface));
    return { session };
  }, "Failed to create payment session");
}

/**
 * Syncs an existing payment session with the provider (e.g. after the cart
 * total changed). Keeps the provider-side session — and therefore the
 * mounted gateway form — alive, unlike creating a fresh session.
 */
export async function updateCheckoutPaymentSession(
  cartId: string,
  sessionId: string,
  params: { amount?: string; external_data?: Record<string, unknown> } = {},
) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const session = await getClientForSurface(
      surface,
    ).carts.paymentSessions.update(id, sessionId, params, options);
    updateTag(checkoutTag(surface));
    return { session };
  }, "Failed to update payment session");
}

/**
 * Creates a direct payment for non-session payment methods
 * (e.g. Check, Cash on Delivery, Bank Transfer).
 */
export async function createDirectPayment(
  cartId: string,
  paymentMethodId: string,
) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const payment = await getClientForSurface(surface).carts.payments.create(
      id,
      { payment_method_id: paymentMethodId },
      options,
    );
    updateTag(checkoutTag(surface));
    return { payment };
  }, "Failed to create payment");
}

export async function completeCheckoutPaymentSession(
  cartId: string,
  sessionId: string,
  params?: { session_result?: string; external_data?: Record<string, unknown> },
) {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const session = await getClientForSurface(
      surface,
    ).carts.paymentSessions.complete(id, sessionId, params, options);
    updateTag(checkoutTag(surface));
    return { session };
  }, "Failed to complete payment session");
}

/**
 * Completes the order. Answers with the order, or with the order group when a
 * marketplace cart spanned several sellers and was split — narrow the result
 * with `isOrderGroup`. Treats 403 and 422 as success:
 * - 403 = cart already completed (e.g. webhook handler completed it)
 * - 422 = state_lock_version conflict (concurrent request)
 *
 * When the order was already completed (403/422), fetch it from the API
 * so the caller always gets the order data for caching on the thank-you page.
 */
export async function completeCheckoutOrder(
  cartId: string,
  knownSurface?: Surface,
) {
  const surface = knownSurface ?? (await resolveSurfaceForCart(cartId));
  try {
    const options = await getCartOptions(surface);
    const order: Order | OrderGroup = await getClientForSurface(
      surface,
    ).carts.complete(cartId, options);
    updateTag(checkoutTag(surface));
    updateTag(cartTag(surface));
    return { success: true as const, order };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status: number }).status;
      if (status === 403 || status === 422) {
        // Order already completed — try to fetch it so the thank-you page
        // can cache and display it without a second round-trip. A split
        // checkout's group can't be fetched by cart id; that resolves to
        // null and the thank-you page falls back to its own lookup.
        const completedOrder = await getOrder(cartId, undefined, surface).catch(
          () => null,
        );
        updateTag(checkoutTag(surface));
        updateTag(cartTag(surface));
        return { success: true as const, order: completedOrder };
      }
    }
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to complete order",
    };
  }
}

/**
 * Confirms payment and completes the order after returning from an offsite
 * payment gateway (e.g. CashApp, 3D Secure).
 */
export async function confirmPaymentAndCompleteCart(
  cartId: string,
  sessionId?: string,
  sessionResult?: string,
  redirectResult?: string,
  adyenSessionId?: string,
): Promise<
  | { success: true; order: Order | OrderGroup | null }
  | { success: false; error: string }
> {
  // Cookies may have been cleared during the offsite redirect, so verify the
  // surface against the cart's own channel rather than trusting the cookie.
  const verifiedSurface = await resolveSurfaceForCartVerified(cartId);
  if (verifiedSurface === "unverified") {
    // The wholesale check couldn't run to completion (transient fetch/channel
    // failure). Fail closed rather than defaulting to DTC: completing a
    // possibly-wholesale checkout through the DTC client, or reporting success
    // for a cart we couldn't fetch, would be worse than asking the caller to
    // retry once the backend recovers.
    return {
      success: false,
      error: "Couldn't confirm your order yet. Please try again in a moment.",
    };
  }
  const surface = verifiedSurface;
  try {
    const cart = await getCart(cartId, surface);
    if (!cart) {
      // Cart not found — the order may already be completed (e.g. by webhook).
      // Try fetching it as a completed order before giving up.
      const completedOrder = await getOrder(cartId, undefined, surface).catch(
        () => null,
      );
      if (completedOrder) return { success: true, order: completedOrder };

      // A split marketplace checkout completed into an order group, which
      // `orders.get(cartId)` can't resolve. Completing is idempotent — the
      // API replays a completed cart's result — so ask for it again.
      const replay = await completeCheckoutOrder(cartId, surface);
      return { success: true, order: replay.success ? replay.order : null };
    }

    if (cart.current_step === "complete") {
      // Already complete — the thank-you page loads the result itself.
      return { success: true, order: null };
    }

    if (sessionId) {
      const options = await getCartOptions(surface);
      const id = await requireCartId(surface);
      const completeResult = await getClientForSurface(
        surface,
      ).carts.paymentSessions.complete(
        id,
        sessionId,
        sessionResult ? { session_result: sessionResult } : undefined,
        options,
      );
      if (completeResult.status === "failed") {
        return {
          success: false,
          error: "Payment was not successful. Please try again.",
        };
      }
    } else if (redirectResult) {
      // Adyen redirect flow: redirectResult is appended by Adyen to the return URL.
      // Pass it to the backend which resolves the session and processes the redirect.
      const options = await getCartOptions(surface);
      const id = await requireCartId(surface);
      const completeResult = await getClientForSurface(
        surface,
      ).carts.paymentSessions.complete(
        id,
        adyenSessionId ?? "",
        {
          external_data: {
            redirect_result: redirectResult,
          },
        },
        options,
      );
      if (completeResult.status === "failed") {
        return {
          success: false,
          error: "Payment was not successful. Please try again.",
        };
      }
    }

    // Pass the verified surface so completion doesn't re-resolve from the
    // (possibly cleared) cookie.
    const result = await completeCheckoutOrder(cartId, surface);
    if (result.success) {
      return { success: true, order: result.order };
    }
    return { success: false, error: result.error };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to confirm payment. Please try again.",
    };
  }
}
