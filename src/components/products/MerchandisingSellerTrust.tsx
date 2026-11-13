"use client";

import { BadgeCheck } from "@/components/icons";
import {
  badgeClassName,
  selectSellerTrustBadge,
} from "@/lib/merchandising/presentation";
import type { MerchandisingSignal } from "./MerchandisingBadges";

type MerchandisingSellerTrustProps = {
  signals: MerchandisingSignal[];
  sellerBadges?: ReadonlyArray<{ key: string }> | null;
  show?: boolean;
  className?: string;
  /** `pill` = bordered chip. `mark` = quiet check for discovery cards. */
  variant?: "pill" | "mark";
};

export function MerchandisingSellerTrust({
  signals,
  sellerBadges = null,
  show = true,
  className = "",
  variant = "pill",
}: MerchandisingSellerTrustProps) {
  const trust = selectSellerTrustBadge({
    signals,
    showSellerTrust: show,
    sellerBadges,
  });
  if (!trust) return null;

  if (variant === "mark") {
    return (
      <span
        className={`ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-medium tracking-tight text-[#8b7355] ${className}`}
        data-merchandising-signal={trust.key}
        data-merchandising-presentation="seller_trust"
        data-trust-variant="mark"
        title={trust.label}
      >
        <BadgeCheck className="size-3 shrink-0 text-[#6b7c5e]" aria-hidden />
        <span className="max-w-[5.5rem] truncate">{trust.label}</span>
      </span>
    );
  }

  return (
    <span
      className={`${badgeClassName(trust)} ${className}`}
      data-merchandising-signal={trust.key}
      data-merchandising-presentation="seller_trust"
      title={trust.label}
    >
      <BadgeCheck className="size-3 shrink-0" aria-hidden />
      {trust.label}
    </span>
  );
}
