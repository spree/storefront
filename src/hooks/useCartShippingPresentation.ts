"use client";

import type { Cart } from "@spree/sdk";
import { useEffect, useMemo, useState } from "react";
import { cartShippingDisplay } from "@/lib/cart/shipping-display";
import { estimateCartShipping } from "@/lib/data/cart-shipping-estimate";
import { readDeliveryDestination } from "@/lib/delivery-destination";

type CartShippingEstimate = {
  display_amount: string;
  free: boolean;
};

export function useCartShippingPresentation(
  cart: Cart | null,
  marketCountry: string,
) {
  const quoted = useMemo(
    () => (cart ? cartShippingDisplay(cart) : null),
    [cart],
  );
  const [estimate, setEstimate] = useState<CartShippingEstimate | null>(null);
  const [pending, setPending] = useState(false);

  const lineKey = useMemo(() => {
    if (!cart?.items?.length) return "";
    return cart.items
      .map((item) => `${item.slug}:${item.variant_id}:${item.quantity}`)
      .join("|");
  }, [cart?.items]);

  useEffect(() => {
    if (!cart?.items?.length || quoted?.hasQuotedShipping) {
      setEstimate(null);
      setPending(false);
      return;
    }

    const activeCart = cart;
    let cancelled = false;

    async function loadEstimate() {
      setPending(true);
      const destination = readDeliveryDestination(marketCountry);
      const result = await estimateCartShipping({
        lines: activeCart.items.map((item) => ({
          slug: item.slug,
          variantId: item.variant_id,
          quantity: item.quantity,
        })),
        countryCode: destination.countryCode,
        postalCode: destination.postalCode || undefined,
        stateCode: destination.stateCode,
      });

      if (cancelled) return;

      setEstimate(result.success ? (result.estimate ?? null) : null);
      setPending(false);
    }

    void loadEstimate();

    const refresh = () => {
      void loadEstimate();
    };
    window.addEventListener("spree:delivery-destination", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      cancelled = true;
      window.removeEventListener("spree:delivery-destination", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [cart, lineKey, marketCountry, quoted?.hasQuotedShipping]);

  const hasQuotedShipping = quoted?.hasQuotedShipping ?? false;
  const isEstimate = !hasQuotedShipping && estimate != null;

  const shippingFree = hasQuotedShipping
    ? (quoted?.shippingFree ?? false)
    : (estimate?.free ?? false);

  const shippingAmount = hasQuotedShipping
    ? (quoted?.shippingAmount ?? null)
    : estimate && !estimate.free
      ? estimate.display_amount
      : null;

  const addOnsShowFreeShipping =
    hasQuotedShipping && (quoted?.shippingFree ?? false);

  return {
    hasQuotedShipping,
    isEstimate,
    pending,
    shippingFree,
    shippingAmount,
    addOnsShowFreeShipping,
  };
}
