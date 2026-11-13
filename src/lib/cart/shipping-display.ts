import type { Cart } from "@spree/sdk";

export type CartShippingDisplay = {
  hasQuotedShipping: boolean;
  shippingFree: boolean;
  shippingAmount: string | null;
};

export function cartShippingDisplay(cart: Cart): CartShippingDisplay {
  const hasQuotedShipping = (cart.fulfillments?.length ?? 0) > 0;
  const deliveryTotal = cart.delivery_total
    ? Number.parseFloat(cart.delivery_total)
    : Number.NaN;

  const shippingFree =
    hasQuotedShipping && Number.isFinite(deliveryTotal) && deliveryTotal === 0;

  const shippingAmount =
    hasQuotedShipping && Number.isFinite(deliveryTotal) && deliveryTotal > 0
      ? cart.display_delivery_total
      : null;

  return { hasQuotedShipping, shippingFree, shippingAmount };
}
