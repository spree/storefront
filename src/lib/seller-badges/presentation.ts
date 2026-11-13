import type { SellerBadge } from "@spree/sdk";
import type { MerchandisingSignal } from "@/components/products/MerchandisingBadges";
import {
  normalizePresentation,
  PRESENTATION,
} from "@/lib/merchandising/presentation";
import type { SellerBadgeKey } from "./keys";
import type { SellerBadgeThemeSettings } from "./theme";

export function sellerHasBadgeKey(
  badges: Array<SellerBadge> | null | undefined,
  key: SellerBadgeKey,
): boolean {
  return (badges ?? []).some((badge) => badge.key === key);
}

/** Hide the legacy merchandising signal when its seller-recognition badge is visible. */
export function shouldSuppressMerchandisingTopShop(
  visibleBadges: Array<SellerBadge> | null | undefined,
): boolean {
  return (
    sellerHasBadgeKey(visibleBadges, "star_seller") ||
    sellerHasBadgeKey(visibleBadges, "top_shop")
  );
}

export function filterMerchandisingSignalsForSellerBadges(
  signals: MerchandisingSignal[],
  visibleBadges: Array<SellerBadge> | null | undefined,
): MerchandisingSignal[] {
  if (!shouldSuppressMerchandisingTopShop(visibleBadges)) {
    return signals;
  }
  return signals.filter(
    (signal) =>
      !(
        signal.key === "top_shop" &&
        normalizePresentation(signal) === PRESENTATION.SELLER_TRUST
      ),
  );
}

/**
 * Preserves API array order (store definition priority). Applies theme allow-list and max count only.
 * Star Seller is omitted here — `StarSellerAvatar` is the single buyer-facing treatment.
 */
export function selectVisibleSellerBadges(
  badges: Array<SellerBadge> | null | undefined,
  settings: SellerBadgeThemeSettings,
): SellerBadge[] {
  if (!settings.showSellerBadges) return [];
  const list = (badges ?? []).filter(
    (badge) =>
      badge.awarded_at != null &&
      badge.key !== "star_seller" &&
      badge.key !== "top_shop",
  );
  if (list.length === 0) return [];

  const allowed = settings.allowedSellerBadges;
  const filtered = allowed
    ? list.filter((badge) => allowed.includes(badge.key as SellerBadgeKey))
    : list;

  return filtered.slice(0, settings.maxSellerBadges);
}

export type SellerBadgeSurface = "product_card" | "pdp" | "seller_shop";

export function maxBadgesForSurface(
  settings: SellerBadgeThemeSettings,
  surface: SellerBadgeSurface,
): number {
  if (surface === "product_card") {
    return Math.min(2, settings.maxSellerBadges);
  }
  if (surface === "pdp") {
    return settings.maxSellerBadges;
  }
  // Shop profile is the full recognition surface — show every earned badge.
  return Math.max(settings.maxSellerBadges, 8);
}
