import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { resolveGatewayId } from "@/lib/utils/payment-gateway";

/**
 * Fallback for backends that do not send the key with the payment method.
 * Removed in Spree 6.2.
 */
const envPublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

interface StripeMethod {
  type: string;
  public_preferences?: Record<string, unknown>;
}

/**
 * The publishable key of the Stripe account behind a payment method. A store
 * can run several Stripe accounts, one per market, so the key travels with
 * the method the cart was offered: confirming an intent with another
 * account's key fails.
 */
export function stripePublishableKey(
  method?: StripeMethod | null,
): string | undefined {
  const key = method?.public_preferences?.publishable_key;
  return typeof key === "string" && key ? key : envPublishableKey;
}

/** The cart's Stripe payment method, if it is offered one. */
export function findStripeMethod<T extends StripeMethod>(
  methods?: T[] | null,
): T | undefined {
  return methods?.find((method) => resolveGatewayId(method.type) === "stripe");
}

const stripeByKey = new Map<string, Promise<Stripe | null>>();

/** Stripe.js for a publishable key, loaded once per key. */
export function getStripe(
  publishableKey: string | undefined,
): Promise<Stripe | null> {
  if (!publishableKey) return Promise.resolve(null);

  let stripe = stripeByKey.get(publishableKey);
  if (!stripe) {
    stripe = loadStripe(publishableKey);
    stripeByKey.set(publishableKey, stripe);
  }
  return stripe;
}
