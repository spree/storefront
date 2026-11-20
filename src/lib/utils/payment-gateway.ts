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

/**
 * Adyen client key for backends that do not send one with the payment
 * session. The session's own client key is preferred: it belongs to the
 * credential that created the session.
 */
export const adyenClientKey = process.env.NEXT_PUBLIC_ADYEN_CLIENT_KEY ?? "";

/**
 * The session's Adyen environment, falling back to the configured one for
 * backends that do not send it.
 */
export function resolveAdyenEnvironment(value: unknown): "test" | "live" {
  if (value === "live" || value === "test") return value;
  return process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT === "live" ? "live" : "test";
}

// Adyen's currency table is leading over ISO 4217 for these
// (docs.adyen.com/development-resources/currency-codes).
const ADYEN_DECIMALS: Record<string, number> = {
  CLP: 2,
  ISK: 2,
  CVE: 0,
  IDR: 0,
};

/**
 * An amount in the minor units Adyen counts for the currency, for Drop-in's
 * displayed total.
 */
export function adyenMinorUnits(amount: string, currency: string): number {
  const code = currency.toUpperCase();
  const decimals =
    ADYEN_DECIMALS[code] ??
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
    }).resolvedOptions().maximumFractionDigits ??
    2;
  return Math.round(Number(amount) * 10 ** decimals);
}
