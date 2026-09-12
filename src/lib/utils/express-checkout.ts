import type { Cart, Fulfillment } from "@spree/sdk";

/**
 * Stripe zero-decimal currencies where the amount is already in the smallest unit.
 * @see https://docs.stripe.com/currencies#zero-decimal
 */
const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

/**
 * Convert a monetary amount to the smallest currency unit for Stripe.
 * For most currencies this means multiplying by 100 (e.g. $9.99 → 999).
 * For zero-decimal currencies (JPY, KRW, etc.) the amount is returned as-is.
 */
export function toCents(amount: string | number, currency?: string): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    throw new TypeError(
      `toCents: expected a finite number, got ${typeof amount} (${String(amount)})`,
    );
  }
  if (currency && STRIPE_ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return Math.round(n);
  }
  return Math.round(n * 100);
}

/** Generate a random 4-char suffix for Google Pay shipping rate ID workaround. */
export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Whether an order has a positive payable total for Stripe. Express Checkout
 * requires a positive `amount`; a null total (money fields hidden for a
 * prices-hidden guest cart) or a zero total has no valid payable amount, so the
 * caller must skip Express Checkout entirely rather than send `amount: 0`.
 */
export function hasPayableTotal(order: Cart): boolean {
  const total = order.total ?? order.item_total;
  if (total == null) return false;
  const n = Number(total);
  return Number.isFinite(n) && n > 0;
}

/**
 * Build the line items array for the Stripe payment sheet from a Spree order.
 * NOTE: Shipping is excluded because the Express Checkout Element handles it
 * separately via shippingRates. Including it here would cause the line item
 * total to exceed the Elements amount, triggering an IntegrationError.
 */
export function buildLineItems(order: Cart) {
  const currency = order.currency;
  const items: Array<{ name: string; amount: number }> = [];

  // The subtotal anchors the breakdown. When it's unknown — money fields are
  // nullable for prices-hidden carts — return no line items at all so the
  // Express Checkout Element falls back to the total-only amount, rather than
  // emitting orphan Discount/Tax lines against a missing subtotal.
  if (order.item_total == null) return items;

  items.push({ name: "Subtotal", amount: toCents(order.item_total, currency) });

  const promoTotal = toCents(order.discount_total ?? "0", currency);
  if (promoTotal < 0) {
    items.push({ name: "Discount", amount: promoTotal });
  }

  const additionalTaxTotal = toCents(
    order.additional_tax_total ?? "0",
    currency,
  );
  if (additionalTaxTotal > 0) {
    items.push({ name: "Tax", amount: additionalTaxTotal });
  }

  return items;
}

/** Parse a Stripe name string (e.g. "John Doe") into first and last name. */
export function parseName(name: string): {
  firstname: string;
  lastname: string;
} {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstname: parts[0] || "", lastname: "" };
  }
  return {
    firstname: parts.slice(0, -1).join(" "),
    lastname: parts[parts.length - 1],
  };
}

/** Build a Spree-compatible address from Stripe address data. */
export function buildSpreeAddress(
  name: { firstname: string; lastname: string },
  address: {
    line1: string;
    line2: string | null;
    city: string;
    postal_code: string;
    country: string;
    state: string | null;
  },
  phone?: string,
) {
  return {
    first_name: name.firstname,
    last_name: name.lastname,
    address1: address.line1,
    address2: address.line2 || undefined,
    city: address.city,
    postal_code: address.postal_code,
    country_code: address.country,
    state_name: address.state || undefined,
    phone: phone || undefined,
  };
}

interface ShippingRateMapping {
  /** Stripe-formatted rates for the payment sheet */
  shippingRates: Array<{ id: string; displayName: string; amount: number }>;
  /** Maps Stripe rate ID → [ { fulfillmentId, rateId } ] for selectDeliveryRate */
  selectionMap: Map<string, Array<{ fulfillmentId: string; rateId: string }>>;
}

/**
 * Build Stripe shipping rates and a selection map from Spree fulfillments.
 * Deduplicates by delivery_method_id. For Google Pay, appends a random suffix
 * to each rate ID to work around its duplicate-ID rejection.
 */
export function buildShippingRateMap(
  shipments: Fulfillment[],
  isGooglePay: boolean,
  currency: string,
): ShippingRateMapping {
  const rateMap = new Map<
    string,
    { id: string; displayName: string; amount: number }
  >();
  const selectionMap = new Map<
    string,
    Array<{ fulfillmentId: string; rateId: string }>
  >();

  for (const shipment of shipments) {
    const rates = shipment.delivery_rates ?? [];

    for (const rate of rates) {
      const methodId = rate.delivery_method_id;

      if (!rateMap.has(methodId)) {
        const id = isGooglePay
          ? `${methodId}-${randomSuffix()}`
          : String(methodId);
        rateMap.set(methodId, {
          id,
          displayName: rate.name,
          amount: toCents(rate.cost, currency),
        });
        selectionMap.set(id, []);
      } else {
        // Accumulate shipping cost from additional fulfillments
        const existing = rateMap.get(methodId)!;
        existing.amount += toCents(rate.cost, currency);
      }
      const stripeId = rateMap.get(methodId)!.id;
      selectionMap.get(stripeId)!.push({
        fulfillmentId: shipment.id,
        rateId: rate.id,
      });
    }
  }

  return {
    shippingRates: Array.from(rateMap.values()),
    selectionMap,
  };
}
