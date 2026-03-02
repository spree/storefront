/** Convert a string dollar amount (e.g. "99.99") to integer cents. */
export function toCents(amount: string | number): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    throw new TypeError(
      `toCents: expected a finite number, got ${typeof amount} (${String(amount)})`,
    );
  }
  return Math.round(n * 100);
}

/** Generate a random 4-char suffix for Google Pay shipping rate ID workaround. */
export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * Build the line items array for the Stripe payment sheet from an order-like object.
 * NOTE: Shipping is excluded because the Express Checkout Element handles it
 * separately via shippingRates. Including it here would cause the line item
 * total to exceed the Elements amount, triggering an IntegrationError.
 */
export function buildLineItems(order: Record<string, unknown>) {
  const items: Array<{ name: string; amount: number }> = [];

  const itemTotal = toCents(order.item_total as string);
  items.push({ name: "Subtotal", amount: itemTotal });

  const promoTotal = toCents(order.promo_total as string);
  if (promoTotal < 0) {
    items.push({ name: "Discount", amount: promoTotal });
  }

  const additionalTaxTotal = toCents(order.additional_tax_total as string);
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
    firstname: name.firstname,
    lastname: name.lastname,
    address1: address.line1,
    address2: address.line2 || undefined,
    city: address.city,
    zipcode: address.postal_code,
    country_iso: address.country,
    state_name: address.state || undefined,
    phone: phone || undefined,
  };
}

interface SpreeShipment {
  id: string;
  shipping_rates: Array<{
    id: string;
    shipping_method_id: string;
    name: string;
    cost: number;
    selected: boolean;
  }>;
}

interface ShippingRateMapping {
  /** Stripe-formatted rates for the payment sheet */
  shippingRates: Array<{ id: string; displayName: string; amount: number }>;
  /** Maps Stripe rate ID → [ { shipmentId, rateId } ] for selectShippingRate */
  selectionMap: Map<string, Array<{ shipmentId: string; rateId: string }>>;
}

/**
 * Build Stripe shipping rates and a selection map from Spree shipments.
 * Deduplicates by shipping_method_id. For Google Pay, appends a random suffix
 * to each rate ID to work around its duplicate-ID rejection.
 */
export function buildShippingRateMap(
  shipments: SpreeShipment[],
  isGooglePay: boolean,
): ShippingRateMapping {
  const rateMap = new Map<
    string,
    { id: string; displayName: string; amount: number }
  >();
  const selectionMap = new Map<
    string,
    Array<{ shipmentId: string; rateId: string }>
  >();

  for (const shipment of shipments) {
    for (const rate of shipment.shipping_rates) {
      if (!rateMap.has(rate.shipping_method_id)) {
        const id = isGooglePay
          ? `${rate.shipping_method_id}-${randomSuffix()}`
          : String(rate.shipping_method_id);
        rateMap.set(rate.shipping_method_id, {
          id,
          displayName: rate.name,
          amount: toCents(rate.cost),
        });
        selectionMap.set(id, []);
      } else {
        // Accumulate shipping cost from additional shipments
        const existing = rateMap.get(rate.shipping_method_id)!;
        existing.amount += toCents(rate.cost);
      }
      const stripeId = rateMap.get(rate.shipping_method_id)!.id;
      selectionMap.get(stripeId)!.push({
        shipmentId: shipment.id,
        rateId: rate.id,
      });
    }
  }

  return {
    shippingRates: Array.from(rateMap.values()),
    selectionMap,
  };
}
