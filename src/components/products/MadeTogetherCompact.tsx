"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MadeTogetherMakerAvatar } from "@/components/products/MadeTogetherMakerAvatar";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import type { MadeTogetherPresentation } from "@/lib/made-together/types";

type MadeTogetherCompactProps = {
  presentation: MadeTogetherPresentation;
};

export function MadeTogetherCompact({
  presentation,
}: MadeTogetherCompactProps) {
  const t = useTranslations("products");
  const { makers, compactRating } = presentation;
  const avatarMakers = makers.slice(0, 2);

  return (
    <div className="flex items-center gap-4 pt-1" data-made-together-compact>
      <div className="flex shrink-0 flex-col items-center px-0 pb-1 pt-0">
        <div className="flex items-center justify-center">
          {avatarMakers.map((maker, index) => (
            <span
              key={maker.key}
              className={`inline-flex rounded-full ${index > 0 ? "-ml-3.5" : ""}`}
            >
              <MadeTogetherMakerAvatar
                name={maker.name}
                logoUrl={maker.logoUrl}
                href={maker.href}
                variantIndex={index}
                className="size-11"
              />
            </span>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {compactRating != null ? (
          <StarRatingDisplay
            rating={compactRating}
            size="sm"
            showValue
            plainValue
            fractional
            tone="amber"
          />
        ) : null}
        <p className="text-base font-bold leading-tight text-[#222]">
          {t("madeTogetherGroupHeading")}
        </p>
        <p className="text-[15px] font-normal leading-snug text-[#222]">
          {makers.map((maker, index) => (
            <span key={maker.key}>
              {index > 0 ? <span aria-hidden="true"> & </span> : null}
              {maker.href ? (
                <Link
                  href={maker.href}
                  className="hover:underline underline-offset-4"
                >
                  {maker.name}
                </Link>
              ) : (
                maker.name
              )}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
