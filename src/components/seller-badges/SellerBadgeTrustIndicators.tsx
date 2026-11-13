"use client";

import type { SellerBadge } from "@spree/sdk";
import { SellerBadgeChip } from "./SellerBadgeChip";
import { SellerBadgeExplainPopover } from "./SellerBadgeExplainPopover";

type SellerBadgeTrustIndicatorsProps = {
  badges: SellerBadge[];
  explain?: boolean;
  className?: string;
};

/** Etsy-style: one or two inline labels beside the shop name on product cards. */
export function SellerBadgeTrustIndicators({
  badges,
  explain = true,
  className = "",
}: SellerBadgeTrustIndicatorsProps) {
  if (badges.length === 0) return null;

  return (
    <ul
      className={`relative z-[1] flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}
      data-seller-badge-trust
    >
      {badges.map((badge) => (
        <li key={badge.id} className="min-w-0 max-w-full">
          {explain ? (
            <SellerBadgeExplainPopover
              badge={badge}
              variant="inline"
              surface="card"
            />
          ) : (
            <SellerBadgeChip badge={badge} variant="inline" surface="card" />
          )}
        </li>
      ))}
    </ul>
  );
}
