import type { MerchandisingSignal } from "@/components/products/MerchandisingBadges";

export const PRESENTATION = {
  COMMERCE_BADGE: "commerce_badge",
  AVAILABILITY_BADGE: "availability_badge",
  MARKETPLACE_BADGE: "marketplace_badge",
  RELEVANCE_REASON: "relevance_reason",
  SELLER_TRUST: "seller_trust",
  RANKING_ONLY: "ranking_only",
} as const;

export type MerchandisingPresentation =
  (typeof PRESENTATION)[keyof typeof PRESENTATION];

export type MerchandisingSurface =
  | "product_card"
  | "homepage_rail"
  | "seller_shop"
  | "favorites"
  | "cart"
  | "checkout"
  | "pdp";

const KEY_PRESENTATION: Record<string, MerchandisingPresentation> = {
  sale: PRESENTATION.COMMERCE_BADGE,
  low_stock: PRESENTATION.AVAILABILITY_BADGE,
  back_in_stock_for_you: PRESENTATION.AVAILABILITY_BADGE,
  price_drop_for_you: PRESENTATION.COMMERCE_BADGE,
  bestseller: PRESENTATION.MARKETPLACE_BADGE,
  popular_now: PRESENTATION.MARKETPLACE_BADGE,
  new: PRESENTATION.MARKETPLACE_BADGE,
  cart_interest: PRESENTATION.MARKETPLACE_BADGE,
  editors_pick: PRESENTATION.MARKETPLACE_BADGE,
  top_shop: PRESENTATION.SELLER_TRUST,
  new_from_followed_shop: PRESENTATION.RELEVANCE_REASON,
  followed_shop: PRESENTATION.RELEVANCE_REASON,
  similar_to_favorites: PRESENTATION.RELEVANCE_REASON,
  viewed_similar: PRESENTATION.RELEVANCE_REASON,
  recent_search_match: PRESENTATION.RELEVANCE_REASON,
  similar_to_purchase: PRESENTATION.RELEVANCE_REASON,
  complementary_item: PRESENTATION.RELEVANCE_REASON,
  recommended_for_you: PRESENTATION.RELEVANCE_REASON,
  preferred_category: PRESENTATION.RANKING_ONLY,
};

const COMMERCE_KEYS = new Set([
  "sale",
  "low_stock",
  "back_in_stock_for_you",
  "price_drop_for_you",
]);

const MARKETPLACE_KEYS = new Set([
  "bestseller",
  "popular_now",
  "new",
  "cart_interest",
  "editors_pick",
]);

const RELEVANCE_KEYS = new Set([
  "followed_shop",
  "new_from_followed_shop",
  "similar_to_favorites",
  "viewed_similar",
  "recent_search_match",
  "similar_to_purchase",
  "complementary_item",
  "recommended_for_you",
]);

const CART_KEYS = new Set(["sale", "price_drop_for_you", "low_stock"]);

const FAVORITES_PRIORITY_KEYS = [
  "price_drop_for_you",
  "back_in_stock_for_you",
  "sale",
  "low_stock",
] as const;

export type MerchandisingThemeSettings = {
  showCommerceBadges?: boolean;
  allowedCommerceBadges?: string[] | null;
  showMarketplaceBadges?: boolean;
  allowedMarketplaceBadges?: string[] | null;
  showSellerTrust?: boolean;
  showPersonalizedRelevance?: boolean;
  showRelevanceReason?: boolean;
  allowedPersonalizedSignals?: string[] | null;
  maxBadgesDesktop?: number;
  maxBadgesMobile?: number;
  badgePosition?: "top_left" | "top_right";
};

export function normalizePresentation(
  signal: MerchandisingSignal,
): MerchandisingPresentation {
  const presentation = signal.presentation;
  if (
    presentation === PRESENTATION.COMMERCE_BADGE ||
    presentation === PRESENTATION.AVAILABILITY_BADGE ||
    presentation === PRESENTATION.MARKETPLACE_BADGE ||
    presentation === PRESENTATION.RELEVANCE_REASON ||
    presentation === PRESENTATION.SELLER_TRUST ||
    presentation === PRESENTATION.RANKING_ONLY
  ) {
    return presentation as MerchandisingPresentation;
  }
  if (presentation === "soft_label") return PRESENTATION.RELEVANCE_REASON;
  if (presentation === "ranking_only") return PRESENTATION.RANKING_ONLY;
  return KEY_PRESENTATION[signal.key] ?? PRESENTATION.MARKETPLACE_BADGE;
}

function parseAllowedList(
  value: unknown,
  fallback: string[] | null = null,
): string[] | null {
  if (Array.isArray(value)) {
    return value.filter((key): key is string => typeof key === "string");
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
  }
  return fallback;
}

export function parseMerchandisingThemeSettings(
  gridSettings: Record<string, unknown> | undefined,
): MerchandisingThemeSettings {
  const legacyShowBadges = gridSettings?.show_badges;
  const legacyAllowed = parseAllowedList(gridSettings?.allowed_badges);
  const legacyMax = Number(gridSettings?.max_badges ?? 2);

  const showCommerce =
    gridSettings?.show_commerce_badges ?? legacyShowBadges ?? true;
  const showMarketplace =
    gridSettings?.show_marketplace_badges ?? legacyShowBadges ?? true;

  return {
    showCommerceBadges: showCommerce !== false && showCommerce !== "false",
    allowedCommerceBadges:
      parseAllowedList(gridSettings?.allowed_commerce_badges) ??
      legacyAllowed ??
      null,
    showMarketplaceBadges:
      showMarketplace !== false && showMarketplace !== "false",
    allowedMarketplaceBadges:
      parseAllowedList(gridSettings?.allowed_marketplace_badges) ??
      legacyAllowed ??
      null,
    showSellerTrust:
      gridSettings?.show_seller_trust !== false &&
      gridSettings?.show_seller_trust !== "false",
    showPersonalizedRelevance:
      (gridSettings?.show_personalized_relevance ??
        gridSettings?.show_personalized_signals ??
        true) !== false &&
      (gridSettings?.show_personalized_relevance ??
        gridSettings?.show_personalized_signals ??
        true) !== "false",
    showRelevanceReason:
      gridSettings?.show_relevance_reason !== false &&
      gridSettings?.show_relevance_reason !== "false",
    allowedPersonalizedSignals: parseAllowedList(
      gridSettings?.allowed_personalized_signals,
    ),
    maxBadgesDesktop: clampBadgeLimit(
      Number(gridSettings?.max_badges_desktop ?? legacyMax ?? 2),
      3,
    ),
    maxBadgesMobile: clampBadgeLimit(
      Number(gridSettings?.max_badges_mobile ?? 1),
      2,
    ),
    badgePosition:
      gridSettings?.badge_position === "top_right" ? "top_right" : "top_left",
  };
}

function clampBadgeLimit(value: number, max: number): number {
  if (!Number.isFinite(value)) return 2;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function isAllowed(
  signal: MerchandisingSignal,
  allowed: string[] | null,
): boolean {
  return !allowed || allowed.includes(signal.key);
}

function sortByPriority(signals: MerchandisingSignal[]): MerchandisingSignal[] {
  return [...signals].sort((left, right) => right.priority - left.priority);
}

export type SurfaceFilterContext = {
  sellerSlug?: string | null;
  suppressRelevanceReason?: boolean;
};

export function filterSignalsForSurface(
  signals: MerchandisingSignal[],
  surface: MerchandisingSurface,
  context: SurfaceFilterContext = {},
): MerchandisingSignal[] {
  let filtered = signals.filter(
    (signal) => normalizePresentation(signal) !== PRESENTATION.RANKING_ONLY,
  );

  if (surface === "checkout") {
    return [];
  }

  if (surface === "cart") {
    return filtered.filter((signal) => CART_KEYS.has(signal.key));
  }

  if (surface === "favorites") {
    filtered = filtered.filter(
      (signal) => signal.key !== "similar_to_favorites",
    );
    const prioritized = FAVORITES_PRIORITY_KEYS.flatMap((key) =>
      filtered.filter((signal) => signal.key === key),
    );
    const remainder = filtered.filter(
      (signal) =>
        !FAVORITES_PRIORITY_KEYS.includes(
          signal.key as (typeof FAVORITES_PRIORITY_KEYS)[number],
        ),
    );
    return [...prioritized, ...sortByPriority(remainder)];
  }

  if (surface === "seller_shop" && context.sellerSlug) {
    filtered = filtered.filter(
      (signal) =>
        !["followed_shop", "new_from_followed_shop"].includes(signal.key),
    );
  }

  if (context.suppressRelevanceReason) {
    filtered = filtered.filter(
      (signal) =>
        normalizePresentation(signal) !== PRESENTATION.RELEVANCE_REASON,
    );
  }

  return filtered;
}

export function selectProductCardImageBadges({
  signals,
  maxBadges,
  allowedCommerceBadges = null,
  allowedMarketplaceBadges = null,
  showCommerceBadges = true,
  showMarketplaceBadges = true,
}: {
  signals: MerchandisingSignal[];
  maxBadges: number;
  allowedCommerceBadges?: string[] | null;
  allowedMarketplaceBadges?: string[] | null;
  showCommerceBadges?: boolean;
  showMarketplaceBadges?: boolean;
}): MerchandisingSignal[] {
  const limit = Math.max(0, Math.floor(maxBadges));
  if (limit === 0) return [];

  const commerce = showCommerceBadges
    ? sortByPriority(
        signals.filter((signal) => {
          const presentation = normalizePresentation(signal);
          return (
            (presentation === PRESENTATION.COMMERCE_BADGE ||
              presentation === PRESENTATION.AVAILABILITY_BADGE) &&
            isAllowed(signal, allowedCommerceBadges)
          );
        }),
      )
    : [];

  const marketplace = showMarketplaceBadges
    ? sortByPriority(
        signals.filter(
          (signal) =>
            normalizePresentation(signal) === PRESENTATION.MARKETPLACE_BADGE &&
            isAllowed(signal, allowedMarketplaceBadges),
        ),
      )
    : [];

  const selectedCommerce = commerce.slice(0, limit);
  const remaining = limit - selectedCommerce.length;

  if (remaining <= 0) return selectedCommerce;

  if (selectedCommerce.length === 1) {
    const marketplaceBadge = marketplace[0];
    return marketplaceBadge
      ? [...selectedCommerce, marketplaceBadge]
      : selectedCommerce;
  }

  if (selectedCommerce.length === 0) {
    return marketplace.slice(0, limit);
  }

  return selectedCommerce;
}

export function sellerTrustMerchandisingSignals(
  signals: MerchandisingSignal[],
  sellerBadges?: ReadonlyArray<{ key: string }> | null,
): MerchandisingSignal[] {
  // Star Seller / legacy Top Shop never appear as a text trust chip —
  // `StarSellerAvatar` is the only buyer-facing Star Seller treatment.
  void sellerBadges;
  return signals.filter(
    (signal) => signal.key !== "top_shop" && signal.key !== "star_seller",
  );
}

export function selectSellerTrustBadge({
  signals,
  showSellerTrust = true,
  sellerBadges = null,
}: {
  signals: MerchandisingSignal[];
  showSellerTrust?: boolean;
  sellerBadges?: ReadonlyArray<{ key: string }> | null;
}): MerchandisingSignal | null {
  if (!showSellerTrust) return null;
  const visible = sellerTrustMerchandisingSignals(signals, sellerBadges);
  return (
    sortByPriority(
      visible.filter(
        (signal) => normalizePresentation(signal) === PRESENTATION.SELLER_TRUST,
      ),
    )[0] ?? null
  );
}

export function selectRelevanceReason({
  signals,
  allowedSignals = null,
  excludeKeys = [],
}: {
  signals: MerchandisingSignal[];
  allowedSignals?: string[] | null;
  excludeKeys?: string[];
}): MerchandisingSignal | null {
  const excluded = new Set(excludeKeys);
  const [reason] = sortByPriority(
    signals.filter(
      (signal) =>
        normalizePresentation(signal) === PRESENTATION.RELEVANCE_REASON &&
        isAllowed(signal, allowedSignals) &&
        !excluded.has(signal.key),
    ),
  );
  return reason ?? null;
}

function pickStrongestMarketplaceBadge(
  signals: MerchandisingSignal[],
): MerchandisingSignal[] {
  const marketplace = sortByPriority(
    signals.filter(
      (signal) =>
        normalizePresentation(signal) === PRESENTATION.MARKETPLACE_BADGE,
    ),
  );
  if (marketplace.length === 0) return [];

  const byKey = new Map(marketplace.map((signal) => [signal.key, signal]));
  if (byKey.has("bestseller")) return [byKey.get("bestseller")!];
  if (byKey.has("popular_now")) return [byKey.get("popular_now")!];
  if (
    byKey.has("cart_interest") &&
    !byKey.has("popular_now") &&
    !byKey.has("bestseller")
  ) {
    return [byKey.get("cart_interest")!];
  }
  return [marketplace[0]];
}

export function selectPdpSignals({
  signals,
  zone,
  excludeKeys = [],
  suppressSaleBadge = false,
}: {
  signals: MerchandisingSignal[];
  zone: "title" | "price" | "availability" | "seller" | "relevance";
  excludeKeys?: string[];
  suppressSaleBadge?: boolean;
}): MerchandisingSignal[] {
  const excluded = new Set(excludeKeys);
  const visible = signals.filter((signal) => !excluded.has(signal.key));

  switch (zone) {
    case "price":
      return sortByPriority(
        visible.filter((signal) => {
          if (normalizePresentation(signal) !== PRESENTATION.COMMERCE_BADGE) {
            return false;
          }
          if (suppressSaleBadge && signal.key === "sale") return false;
          return ["sale", "price_drop_for_you"].includes(signal.key);
        }),
      ).slice(0, 1);
    case "availability":
      return sortByPriority(
        visible.filter(
          (signal) =>
            normalizePresentation(signal) === PRESENTATION.AVAILABILITY_BADGE,
        ),
      ).slice(0, 1);
    case "title":
      return pickStrongestMarketplaceBadge(visible);
    case "seller":
      return sortByPriority(
        visible.filter(
          (signal) =>
            normalizePresentation(signal) === PRESENTATION.SELLER_TRUST,
        ),
      ).slice(0, 1);
    case "relevance":
      return sortByPriority(
        visible.filter(
          (signal) =>
            normalizePresentation(signal) === PRESENTATION.RELEVANCE_REASON,
        ),
      ).slice(0, 1);
    default:
      return [];
  }
}

export type MerchandisingBadgeLayout =
  | "overlay"
  | "inline"
  | "pdp-title"
  | "pdp-detail";

export function badgeClassName(
  signal: MerchandisingSignal,
  layout: MerchandisingBadgeLayout = "overlay",
): string {
  const presentation = normalizePresentation(signal);
  if (
    layout === "pdp-title" &&
    presentation === PRESENTATION.MARKETPLACE_BADGE
  ) {
    if (
      signal.scope === "editorial" ||
      signal.key === "editors_pick" ||
      signal.key === "marketplace_pick"
    ) {
      return "rounded-sm bg-[#fdebc2] px-2 py-1 text-xs font-medium leading-tight text-[#222] shadow-sm";
    }
    return "rounded border border-[#e1e3df] bg-white px-1.5 py-0.5 text-[11px] font-medium leading-tight text-[#595959]";
  }
  if (
    presentation === PRESENTATION.COMMERCE_BADGE ||
    presentation === PRESENTATION.AVAILABILITY_BADGE
  ) {
    if (signal.key === "sale") {
      return layout === "pdp-detail"
        ? "rounded-md bg-marketplace-sale px-2 py-0.5 text-[11px] font-semibold leading-4 text-white"
        : "rounded-full bg-marketplace-sale px-2 py-0.5 text-[11px] font-semibold leading-4 text-white";
    }
    return layout === "pdp-detail"
      ? "rounded-md bg-[#222] px-2 py-0.5 text-[11px] font-semibold leading-4 text-white"
      : "rounded-full bg-marketplace-foreground px-2 py-0.5 text-[11px] font-semibold leading-4 text-marketplace-surface shadow-sm";
  }
  if (presentation === PRESENTATION.MARKETPLACE_BADGE) {
    return "rounded-full bg-marketplace-surface/95 px-2 py-0.5 text-[11px] font-medium leading-4 text-marketplace-muted-foreground shadow-sm ring-1 ring-marketplace-border";
  }
  if (presentation === PRESENTATION.SELLER_TRUST) {
    return "inline-flex items-center gap-1 text-[11px] font-medium leading-4 tracking-tight text-[#8b7355]";
  }
  return "rounded-full bg-marketplace-surface/95 px-2 py-0.5 text-[11px] font-medium leading-4 text-marketplace-foreground shadow-sm ring-1 ring-marketplace-border";
}

export { COMMERCE_KEYS, MARKETPLACE_KEYS, RELEVANCE_KEYS };
