"use client";

import { createContext, useContext } from "react";

/**
 * Signals to shared price-rendering components (ProductCard, ProductDetails)
 * that money fields are `null` because the viewer is not entitled to see them.
 * When active, a null price is a *deliberate* hide, so those components render
 * a prompt instead of silently omitting the price.
 *
 * Only the wholesale route group provides this. The DTC storefront never does,
 * so its null-price behaviour (render nothing) is unchanged.
 */
export interface HiddenPricingValue {
  /** Where the sign-in prompt links to (already includes the return `?redirect=`). */
  signInHref: string;
  /**
   * What the buyer can do about it, from the API's `pricing_access` code.
   * Defaults to signing in, which is the guest case and the only remedy the
   * prompt had before companies existed.
   */
  remedy?: "sign-in" | "register" | "awaiting-approval";
  /** Where the register prompt links to, when the remedy is registering. */
  registerHref?: string;
}

const HiddenPricingContext = createContext<HiddenPricingValue | null>(null);

export function HiddenPricingProvider({
  value,
  children,
}: {
  value: HiddenPricingValue;
  children: React.ReactNode;
}) {
  return (
    <HiddenPricingContext.Provider value={value}>
      {children}
    </HiddenPricingContext.Provider>
  );
}

/**
 * Returns the hidden-pricing context, or `null` outside a provider (i.e. the
 * DTC storefront). A null return means "prices aren't gated here" — components
 * should keep their existing behaviour.
 */
export function useHiddenPricing(): HiddenPricingValue | null {
  return useContext(HiddenPricingContext);
}
