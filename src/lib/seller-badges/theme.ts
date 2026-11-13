import type { SellerBadgeKey } from "./keys";

export type SellerBadgeThemeSettings = {
  showSellerBadges: boolean;
  allowedSellerBadges: SellerBadgeKey[] | null;
  maxSellerBadges: number;
};

function parseAllowedList(value: unknown): SellerBadgeKey[] | null {
  if (Array.isArray(value)) {
    return value.filter(
      (key): key is SellerBadgeKey => typeof key === "string",
    );
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean) as SellerBadgeKey[];
  }
  return null;
}

function clampMax(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(4, Math.floor(parsed)));
}

export function parseSellerBadgeThemeSettings(
  gridSettings: Record<string, unknown> | undefined,
): SellerBadgeThemeSettings {
  const show =
    gridSettings?.show_seller_badges === true ||
    gridSettings?.show_seller_badges === "true";

  return {
    showSellerBadges: show,
    allowedSellerBadges: parseAllowedList(gridSettings?.allowed_seller_badges),
    maxSellerBadges: clampMax(gridSettings?.max_seller_badges, 2),
  };
}
