"use client";

import type { SellerBadge } from "@spree/sdk";
import { useTranslations } from "next-intl";
import type { SellerBadgeSurface } from "@/lib/seller-badges/presentation";
import { SellerBadgeChip } from "./SellerBadgeChip";
import { SellerBadgeExplainPopover } from "./SellerBadgeExplainPopover";
import type { SellerBadgeIconSize } from "./SellerBadgeIcon";

type SellerBadgeRowProps = {
  badges: SellerBadge[];
  surface?: SellerBadgeSurface;
  showHeading?: boolean;
  explain?: boolean;
  iconSize?: SellerBadgeIconSize;
  className?: string;
};

function surfaceToChipSurface(
  surface: SellerBadgeSurface,
): "card" | "pdp" | "shop" {
  if (surface === "seller_shop") return "shop";
  if (surface === "pdp") return "pdp";
  return "card";
}

export function SellerBadgeRow({
  badges,
  surface = "seller_shop",
  showHeading = surface === "seller_shop",
  explain = true,
  iconSize,
  className = "",
}: SellerBadgeRowProps) {
  const t = useTranslations("sellers");
  if (badges.length === 0) return null;

  const chipSurface = surfaceToChipSurface(surface);

  return (
    <section
      className={className}
      aria-label={t("sellerRecognitionHeading")}
      data-seller-badge-row={surface}
    >
      {showHeading ? (
        <p className="mb-1.5 text-sm text-[#595959]">
          {t("sellerRecognitionHeading")}
        </p>
      ) : null}
      <ul className="flex flex-wrap items-center gap-2.5">
        {badges.map((badge) => (
          <li key={badge.id} className="shrink-0">
            {explain ? (
              <SellerBadgeExplainPopover
                badge={badge}
                variant="icon"
                surface={chipSurface}
                iconSize={iconSize}
              />
            ) : (
              <SellerBadgeChip
                badge={badge}
                variant="iconOnly"
                surface={chipSurface}
                iconSize={iconSize}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
