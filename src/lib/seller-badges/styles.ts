import type { SellerBadgeKey } from "./keys";

/** Etsy-style accent tints — paired with distinct icon shapes, not color alone. */
export const SELLER_BADGE_ICON_ACCENT: Record<SellerBadgeKey, string> = {
  verified_seller: "#258635",
  star_seller: "#f1641e",
  top_shop: "#f1641e",
  highly_rated: "#d4a017",
  fast_responder: "#3b67d4",
  on_time_shipping: "#258635",
  established_seller: "#595959",
  marketplace_pick: "#7b2cbf",
};

export function sellerBadgeTextClass(surface: "card" | "pdp" | "shop"): string {
  switch (surface) {
    case "card":
      return "text-[11px] font-semibold leading-4 text-[#222]";
    case "pdp":
      return "text-[13px] font-semibold leading-snug text-[#222]";
    case "shop":
      return "text-sm font-semibold leading-snug text-[#222]";
    default:
      return "text-xs font-semibold text-[#222]";
  }
}
