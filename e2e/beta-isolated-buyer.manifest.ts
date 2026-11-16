/**
 * Buyer beta verification manifest — run with:
 *   pnpm exec playwright test -c playwright.beta-isolated.config.ts <files> --workers=1
 */

export const BETA_ISOLATED_BUYER_SPECS = [
  "runtime-recovery.spec.ts",
  "storefront-3-shell.spec.ts",
  "storefront-3-discovery.spec.ts",
  "homepage-visual.spec.ts",
  "merchandising-search.spec.ts",
  "merchandising-pdp.spec.ts",
  "merchandising-seller-storefront.spec.ts",
  "personalized-product.spec.ts",
  "multi-seller-checkout.spec.ts",
  "buyer-dashboard-beta.spec.ts",
  "messaging-trust-safety.spec.ts",
  "privacy-personalization.spec.ts",
  "buyer-privacy-isolation.spec.ts",
  "merchandising-recommended-fallback.spec.ts",
  "reviews.smoke.ts",
] as const;

export const BETA_BUYER_DESKTOP_SPECS = [
  "buyer-dashboard-beta.spec.ts",
  "storefront-3-shell.spec.ts",
  "storefront-3-discovery.spec.ts",
] as const;

export const BETA_BUYER_MOBILE_SPECS = ["storefront-3-shell.spec.ts"] as const;
