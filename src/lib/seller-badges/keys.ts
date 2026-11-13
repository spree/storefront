/** Canonical Store API keys in backend priority order, followed by the legacy alias. */
export const SELLER_BADGE_KEYS = [
  "verified_seller",
  "star_seller",
  "highly_rated",
  "fast_responder",
  "on_time_shipping",
  "established_seller",
  "marketplace_pick",
  "top_shop",
] as const;

export type SellerBadgeKey = (typeof SELLER_BADGE_KEYS)[number];

export function isSellerBadgeKey(value: string): value is SellerBadgeKey {
  return (SELLER_BADGE_KEYS as readonly string[]).includes(value);
}
