import type { Product } from "@spree/sdk";
import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { StarRatingDisplay } from "./StarRating";

interface RatingDistributionProps {
  product: Product;
  locale: string;
  /** Flatter layout for the PDP column (no outer card). */
  variant?: "card" | "flat";
}

export async function RatingDistribution({
  product,
  locale,
  variant = "flat",
}: RatingDistributionProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "reviews",
  });

  const count = product.reviews_count ?? 0;
  const average = product.average_rating;
  const distribution = product.rating_distribution ?? {};

  if (count === 0 || average == null) {
    return null;
  }

  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    value: Number(distribution[String(star)] ?? 0),
  }));
  const distributionTotal = buckets.reduce(
    (sum, bucket) => sum + bucket.value,
    0,
  );
  const barDenominator = Math.max(count, distributionTotal, 1);

  const shellClass =
    variant === "card"
      ? "rounded-2xl border border-marketplace-border-subtle bg-marketplace-surface px-5 py-6 sm:px-6"
      : "";

  return (
    <div className={shellClass}>
      <div className="grid gap-8 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:items-center sm:gap-10 lg:gap-14">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <p
            className="text-[2.75rem] font-semibold leading-none tracking-tight text-marketplace-foreground sm:text-5xl"
            aria-hidden="true"
          >
            {average.toFixed(1)}
          </p>
          <div className="mt-2">
            <StarRatingDisplay rating={average} size="md" tone="dark" />
          </div>
          <p className="mt-2 text-sm text-marketplace-muted-foreground">
            {t("reviewCount", { count })}
          </p>
          <p className="sr-only">
            {t("ratingOutOf", {
              rating: average.toFixed(1),
              max: "5",
            })}
          </p>
        </div>

        <ul className="min-w-0 space-y-2.5" aria-label={t("ratingBreakdown")}>
          {buckets.map(({ star, value }) => {
            const width = Math.min(100, (value / barDenominator) * 100);
            return (
              <li
                key={star}
                className="grid grid-cols-[3.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-3 gap-y-0"
              >
                <span className="inline-flex items-center justify-end gap-0.5 text-sm font-medium text-marketplace-foreground">
                  {star}
                  <Star
                    className="size-3.5 shrink-0 fill-marketplace-foreground text-marketplace-foreground"
                    aria-hidden
                  />
                </span>
                <div
                  className="h-2 overflow-hidden rounded-full bg-marketplace-border-subtle"
                  role="progressbar"
                  aria-label={t("starBucketLabel", { star, count: value })}
                  aria-valuemin={0}
                  aria-valuemax={barDenominator}
                  aria-valuenow={value}
                >
                  <div
                    className="h-full rounded-full bg-marketplace-brand transition-[width] duration-300 ease-out"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-right text-xs tabular-nums text-marketplace-muted-foreground">
                  {value}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
