/**
 * Gateway type registry for conditional SDK loading.
 *
 * Maps Spree PaymentMethod.type (API shorthand) to a frontend gateway
 * identifier so the checkout can dynamically import the right SDK component.
 *
 * Only session-based gateways need this mapping. Non-session methods
 * (session_required === false) use the direct payment flow with no SDK.
 */

/** Known gateway identifiers for conditional SDK loading */
export type GatewayId = "stripe" | "adyen" | "paypal" | "razorpay" | "unknown";

/**
 * Map Spree PaymentMethod.type (API shorthand) → frontend gateway ID.
 *
 * The Store API returns `Spree::Gateway.api_type` — for provider gems
 * that ship a top-level `Gateway` class, that's the outer module name
 * stripped of its `Spree` prefix and underscored:
 *
 *   SpreeStripe::Gateway          → "stripe"
 *   SpreeAdyen::Gateway           → "adyen"
 *   SpreePaypalCheckout::Gateway  → "paypal_checkout"
 *   SpreeRazorpayCheckout::Gateway → "razorpay_checkout"
 *
 * For gems whose shorthand already matches the frontend ID (`stripe`,
 * `adyen`), the map mostly normalises the suffixed forms. Legacy Rails
 * STI class names are kept for backwards compatibility with older Spree
 * backends that haven't been upgraded yet.
 *
 * Adding a new gateway integration is a single line here.
 */
const GATEWAY_TYPE_MAP: Record<string, GatewayId> = {
  // Stripe (spree_stripe gem)
  stripe: "stripe",
  "SpreeStripe::Gateway": "stripe",
  "Spree::Gateway::StripeGateway": "stripe",
  // Adyen (spree_adyen gem)
  adyen: "adyen",
  "SpreeAdyen::Gateway": "adyen",
  "Spree::Gateway::AdyenGateway": "adyen",
  // PayPal (spree_paypal_checkout gem)
  paypal_checkout: "paypal",
  paypal: "paypal",
  "SpreePaypalCheckout::Gateway": "paypal",
  "Spree::Gateway::PayPalExpress": "paypal",
  // Razorpay (spree_razorpay_checkout gem)
  razorpay_checkout: "razorpay",
  razorpay: "razorpay",
  "SpreeRazorpayCheckout::Gateway": "razorpay",
  "Spree::Gateway::RazorpayGateway": "razorpay",
};

/**
 * Resolve a Spree PaymentMethod.type to a frontend gateway identifier.
 * Returns "unknown" for unrecognised session-based gateways.
 */
export function resolveGatewayId(paymentMethodType: string): GatewayId {
  return GATEWAY_TYPE_MAP[paymentMethodType] ?? "unknown";
}

/**
 * PayPal client ID for backends that do not send one with the payment
 * session. The session's own client ID is preferred: it always matches the
 * credentials that created the order.
 */
export const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

/** Whether Adyen is configured (client key present in env). */
export const isAdyenConfigured = Boolean(
  process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY,
);

/** Adyen client key for Drop-in initialization. */
export const adyenClientKey = process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY ?? "";

/** Adyen environment: "test" or "live". */
const rawAdyenEnv = process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT;
export const adyenEnvironment: "test" | "live" =
  rawAdyenEnv === "live" ? "live" : "test";
