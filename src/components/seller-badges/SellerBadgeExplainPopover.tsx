"use client";

import type { SellerBadge } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { useId } from "react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isSellerBadgeKey } from "@/lib/seller-badges/keys";
import { SellerBadgeChip } from "./SellerBadgeChip";
import type { SellerBadgeIconSize } from "./SellerBadgeIcon";

type SellerBadgeExplainPopoverProps = {
  badge: SellerBadge;
  variant?: "chip" | "compact" | "icon" | "inline";
  surface?: "card" | "pdp" | "shop";
  iconSize?: SellerBadgeIconSize;
  className?: string;
};

export function SellerBadgeExplainPopover({
  badge,
  variant = "inline",
  surface = "card",
  iconSize,
  className = "",
}: SellerBadgeExplainPopoverProps) {
  const t = useTranslations("sellers");
  const titleId = useId();
  const descriptionId = useId();
  if (!isSellerBadgeKey(badge.key)) return null;

  const learnMore = t("badgeLearnMore", { badge: badge.label });
  const chipVariant =
    variant === "icon"
      ? "bareIcon"
      : variant === "compact"
        ? "compact"
        : variant === "inline"
          ? "inline"
          : "default";

  const triggerClass =
    variant === "inline" || variant === "compact"
      ? "cursor-pointer rounded-sm decoration-[#222]/35 underline-offset-2 hover:underline hover:decoration-dotted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#222]"
      : "rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-marketplace-brand";

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={`inline-flex items-center ${triggerClass} ${className} ${variant === "icon" ? "transition-transform duration-150 hover:scale-105 focus-visible:outline-offset-4" : ""}`}
        aria-label={learnMore}
        title={badge.label}
        data-seller-badge-trigger={badge.key}
      >
        <SellerBadgeChip
          badge={badge}
          variant={chipVariant}
          surface={surface}
          iconSize={iconSize}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(100vw-2rem,20rem)] rounded-xl border-[#e1e3df] bg-white p-4 shadow-lg"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <PopoverHeader className="gap-1.5">
          <PopoverTitle
            id={titleId}
            className="text-base font-semibold text-[#222]"
          >
            {badge.label}
          </PopoverTitle>
          <PopoverDescription
            id={descriptionId}
            className="text-sm leading-relaxed text-[#595959]"
          >
            {badge.description}
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}
