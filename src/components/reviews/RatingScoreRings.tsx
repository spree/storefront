import type { Product } from "@spree/sdk";
import { getTranslations } from "next-intl/server";

const SCORE_COLOR = "#b77a20";

type RatingScoreRingsProps = {
  product: Product;
  locale: string;
  metrics?: {
    itemQuality: number | null;
    shipping: number | null;
    customerService: number | null;
    recommendationRate: number | null;
  };
};

function RatingMetric({
  value,
  label,
  format = "decimal",
}: {
  value: number;
  label: string;
  format?: "decimal" | "percent";
}) {
  const max = format === "percent" ? 100 : 5;
  const progress = Math.min(100, Math.max(0, (value / max) * 100));
  const display =
    format === "percent" ? `${Math.round(value)}%` : value.toFixed(1);

  return (
    <div className="min-w-0 px-2 first:pl-0 last:pr-0 sm:px-3">
      <p className="h-10 whitespace-normal break-words text-[11px] font-medium leading-4 text-[#615a62]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold leading-5 tabular-nums text-[#302a31]">
        {display}
        {format === "decimal" ? (
          <span className="ml-1 text-[11px] font-normal text-[#817980]">
            / 5
          </span>
        ) : null}
      </p>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-[#e8e2dc]"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: SCORE_COLOR }}
        />
      </div>
    </div>
  );
}

export async function RatingScoreRings({
  product,
  locale,
  metrics,
}: RatingScoreRingsProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "reviews",
  });

  const rings: Array<{
    value: number;
    label: string;
    format?: "decimal" | "percent";
  }> = [];

  const itemQuality =
    product.average_item_quality_rating ?? metrics?.itemQuality;
  const shipping = product.average_shipping_rating ?? metrics?.shipping;
  const customerService =
    product.average_customer_service_rating ?? metrics?.customerService;
  const recommendationRate =
    product.recommendation_rate ?? metrics?.recommendationRate;

  if (itemQuality != null) {
    rings.push({
      value: Number(itemQuality),
      label: t("itemQualityRating"),
    });
  }
  if (shipping != null) {
    rings.push({
      value: Number(shipping),
      label: t("shippingRating"),
    });
  }
  if (customerService != null) {
    rings.push({
      value: Number(customerService),
      label: t("customerServiceRating"),
    });
  }
  if (recommendationRate != null) {
    rings.push({
      value: Number(recommendationRate),
      label: t("buyersRecommend"),
      format: "percent",
    });
  }

  if (rings.length === 0) return null;

  return (
    <section
      className="border-y border-[#e2ddd8] py-4 sm:py-5"
      aria-label={t("ratingBreakdown")}
    >
      <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-4 py-1 sm:grid-cols-4 sm:gap-x-2 sm:gap-y-2">
        {rings.map((ring) => (
          <RatingMetric
            key={ring.label}
            value={ring.value}
            label={ring.label}
            format={ring.format}
          />
        ))}
      </div>
    </section>
  );
}
