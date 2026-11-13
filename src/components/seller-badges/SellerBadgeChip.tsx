"use client";

import type { SellerBadge } from "@spree/sdk";
import { isSellerBadgeKey } from "@/lib/seller-badges/keys";
import { sellerBadgeTextClass } from "@/lib/seller-badges/styles";
import { SellerBadgeIcon, type SellerBadgeIconSize } from "./SellerBadgeIcon";

export type SellerBadgeChipVariant =
  | "default"
  | "compact"
  | "iconOnly"
  | "bareIcon"
  | "inline";

type SellerBadgeChipProps = {
  badge: SellerBadge;
  variant?: SellerBadgeChipVariant;
  surface?: "card" | "pdp" | "shop";
  iconSize?: SellerBadgeIconSize;
  className?: string;
};

const chipBase =
  "inline-flex max-w-full items-center gap-1 rounded-full bg-marketplace-surface-subtle text-marketplace-foreground ring-1 ring-marketplace-border";

export function SellerBadgeChip({
  badge,
  variant = "default",
  surface = "card",
  iconSize,
  className = "",
}: SellerBadgeChipProps) {
  if (!isSellerBadgeKey(badge.key)) return null;

  const resolvedIconSize: SellerBadgeIconSize =
    iconSize ??
    (variant === "inline"
      ? surface === "pdp"
        ? 16
        : 14
      : variant === "compact"
        ? 16
        : variant === "iconOnly"
          ? 20
          : 20);

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex max-w-full items-center gap-1 ${className}`}
        data-seller-badge={badge.key}
      >
        <SellerBadgeIcon
          badgeKey={badge.key}
          size={resolvedIconSize}
          className="shrink-0"
          aria-hidden
        />
        <span className={`truncate ${sellerBadgeTextClass(surface)}`}>
          {badge.label}
        </span>
      </span>
    );
  }

  if (variant === "iconOnly") {
    return (
      <span
        className={`${chipBase} px-1.5 py-1 ${className}`}
        data-seller-badge={badge.key}
      >
        <SellerBadgeIcon
          badgeKey={badge.key}
          size={resolvedIconSize}
          aria-hidden
        />
        <span className="sr-only">{badge.label}</span>
      </span>
    );
  }

  if (variant === "bareIcon") {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        data-seller-badge={badge.key}
      >
        <SellerBadgeIcon
          badgeKey={badge.key}
          size={resolvedIconSize}
          className="shrink-0"
          aria-hidden
        />
        <span className="sr-only">{badge.label}</span>
      </span>
    );
  }

  const textClass =
    variant === "compact"
      ? "truncate text-[10px] font-medium leading-4 text-[#222]"
      : "truncate text-[11px] font-medium leading-4 text-[#222]";

  return (
    <span
      className={`${chipBase} px-2 py-0.5 ${className}`}
      data-seller-badge={badge.key}
    >
      <SellerBadgeIcon
        badgeKey={badge.key}
        size={resolvedIconSize}
        className="shrink-0"
        aria-hidden
      />
      <span className={textClass}>{badge.label}</span>
    </span>
  );
}
