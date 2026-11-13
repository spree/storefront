import type { Product } from "@spree/sdk";
import { getTranslations } from "next-intl/server";
import { StarRatingDisplay } from "./StarRating";

type ProductReviewsSectionHeaderProps = {
  product: Product;
  locale: string;
  reviewCount?: number;
  averageRating?: number | null;
  embedded?: boolean;
};

export async function ProductReviewsSectionHeader({
  product,
  locale,
  reviewCount,
  averageRating,
  embedded = false,
}: ProductReviewsSectionHeaderProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "reviews",
  });

  const title = embedded ? t("pdpTitle") : t("title");

  if (!embedded) {
    return (
      <h2 className="text-lg font-semibold tracking-tight text-marketplace-foreground">
        {title}
      </h2>
    );
  }

  const count = reviewCount ?? product.reviews_count ?? 0;
  const average = averageRating ?? product.average_rating;

  return (
    <header className="flex flex-col gap-3 pb-1">
      <h2 className="text-base font-bold leading-snug text-[#222] md:text-lg">
        {title}
      </h2>
      {count > 0 && average != null ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[2rem] font-normal leading-none tabular-nums text-[#222]">
            {average.toFixed(1)}
          </span>
          <StarRatingDisplay rating={average} size="md" tone="amber" />
          <p className="text-sm text-[#222]">
            <span className="border-b border-dotted border-[#222]/50">
              {t("itemAverageLabel")}
            </span>{" "}
            <span className="underline decoration-[#222]/30 underline-offset-2">
              ({t("reviewCount", { count })})
            </span>
          </p>
        </div>
      ) : count > 0 ? (
        <span className="text-sm tabular-nums text-[#6f6870]">
          {t("reviewCount", { count })}
        </span>
      ) : null}
    </header>
  );
}
