"use client";

import type { ComponentType } from "react";
import {
  Eye,
  Gift,
  Heart,
  Package,
  Search,
  type SpreeIconProps,
  Star,
  Store,
} from "@/components/icons";
import {
  type MerchandisingSignal,
  selectMerchandisingReason,
} from "./MerchandisingBadges";

type MerchandisingReasonProps = {
  signals: MerchandisingSignal[];
  allowedSignals?: string[] | null;
  excludeKeys?: string[];
  followedShopLabel?: string;
  className?: string;
};

type ReasonIcon = ComponentType<Omit<SpreeIconProps, "name">>;

const REASON_ICONS: Record<string, ReasonIcon> = {
  followed_shop: Store,
  new_from_followed_shop: Store,
  recent_search_match: Search,
  similar_to_favorites: Heart,
  viewed_similar: Eye,
  similar_to_purchase: Package,
  complementary_item: Gift,
  recommended_for_you: Star,
};

export function MerchandisingReason({
  signals,
  allowedSignals = null,
  excludeKeys = [],
  followedShopLabel,
  className = "",
}: MerchandisingReasonProps) {
  const reason = selectMerchandisingReason({
    signals,
    allowedSignals,
    excludeKeys,
  });
  if (!reason) return null;
  const isFollowedShopReason =
    reason.key === "followed_shop" || reason.key === "new_from_followed_shop";
  const Icon = REASON_ICONS[reason.key] ?? Star;

  return (
    <p
      className={`${isFollowedShopReason ? "inline-flex max-w-full items-center gap-2 text-xs font-medium leading-snug text-marketplace-muted-foreground" : "flex items-start gap-1.5 text-xs font-medium leading-snug text-marketplace-muted-foreground"} ${className}`}
      data-merchandising-reason={reason.key}
      data-merchandising-presentation="relevance_reason"
    >
      {isFollowedShopReason ? (
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-marketplace-accent text-marketplace-brand">
          <Store className="size-3.5" aria-hidden="true" strokeWidth={2} />
        </span>
      ) : (
        <Icon
          className="mt-0.5 size-3.5 shrink-0 text-marketplace-brand"
          aria-hidden
        />
      )}
      <span>
        {isFollowedShopReason && followedShopLabel
          ? followedShopLabel
          : reason.label}
      </span>
    </p>
  );
}
