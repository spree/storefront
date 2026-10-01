"use server";

import type { Cart } from "@spree/sdk";
import { updateTag } from "next/cache";
import {
  cacheTagSuffix,
  getCartOptions,
  getClientForSurface,
  requireCartId,
  type Surface,
} from "@/lib/spree";
import { resolveSurfaceForCart } from "./checkout";
import { getCustomer } from "./customer";
import { actionResult } from "./utils";

/**
 * Store credit is deliberately not a payment method in this storefront. Spree
 * returns it among `cart.payment_methods`, but drawing it takes its own
 * endpoint — a balance spread over several credits needs more than one payment,
 * so there is no single payment to create — and it reduces `amount_due` rather
 * than settling the order. The checkout surfaces it as its own widget and
 * filters it out of the payment-method selector; these actions back that widget.
 */

export interface StoreCreditBalance {
  /** Numeric balance, for "is there anything left to apply?" checks. */
  amount: number;
  /** Currency-formatted balance, straight from the API. */
  displayAmount: string;
}

function checkoutTag(surface: Surface): string {
  return `checkout${cacheTagSuffix(surface)}`;
}

function cartTag(surface: Surface): string {
  return `cart${cacheTagSuffix(surface)}`;
}

/**
 * The signed-in customer's spendable store credit. Returns null for guests and
 * whenever the balance can't be read — the widget stays hidden either way.
 */
export async function getStoreCreditBalance(): Promise<StoreCreditBalance | null> {
  const customer = await getCustomer();
  if (!customer) return null;

  const amount = parseFloat(customer.available_store_credit_total ?? "");
  if (!Number.isFinite(amount)) return null;

  return {
    amount,
    displayAmount: customer.display_available_store_credit_total,
  };
}

/**
 * Applies the customer's store credit to the cart, drawing as much of the
 * outstanding balance as the available credits cover. Answers with the updated
 * cart — read `amount_due` / `covered_by_store_credit` to see whether anything
 * is still to collect.
 */
export async function applyStoreCredit(
  cartId: string,
): Promise<{ success: true; cart: Cart } | { success: false; error: string }> {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const cart = await getClientForSurface(surface).carts.storeCredits.apply(
      id,
      undefined,
      options,
    );
    updateTag(checkoutTag(surface));
    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to apply store credit");
}

/**
 * Releases the store credit applied to the cart, returning it to the
 * customer's balance and restoring the full amount due.
 */
export async function removeStoreCredit(
  cartId: string,
): Promise<{ success: true; cart: Cart } | { success: false; error: string }> {
  return actionResult(async () => {
    const surface = await resolveSurfaceForCart(cartId);
    const options = await getCartOptions(surface);
    const id = await requireCartId(surface);
    const cart = await getClientForSurface(surface).carts.storeCredits.remove(
      id,
      options,
    );
    updateTag(checkoutTag(surface));
    updateTag(cartTag(surface));
    return { cart };
  }, "Failed to remove store credit");
}
