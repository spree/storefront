import type { Product } from "@spree/sdk";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  getProductReviewAttributeScores,
  getProductReviews,
} from "@/lib/data/reviews";
import { promiseWithTimeout } from "@/lib/utils/promise-with-timeout";
import { buildEtsyTopicChipDefs } from "./etsy-review-topic-chips";
import { ProductReviewCardView } from "./ProductReviewCardView";
import { ProductReviewStructuredData } from "./ProductReviewStructuredData";
import { ProductReviewsBuyerHighlights } from "./ProductReviewsBuyerHighlights";
import { ProductReviewsEmptyState } from "./ProductReviewsEmptyState";
import { ProductReviewsEtsyFilters } from "./ProductReviewsEtsyFilters";
import { ProductReviewsFilters } from "./ProductReviewsFilters";
import { ProductReviewsList } from "./ProductReviewsList";
import { ProductReviewsSectionHeader } from "./ProductReviewsSectionHeader";
import {
  type ProductReviewSort,
  ProductReviewsSort,
} from "./ProductReviewsSort";
import {
  buildReviewListHref,
  buildReviewListQuery,
  PDP_PREVIEW_REVIEW_LIMIT,
  type ProductReviewListFilters,
  resolveProductReviewCount,
} from "./product-review-list-filters";
import { RatingDistribution } from "./RatingDistribution";
import { RatingScoreRings } from "./RatingScoreRings";
import { ReviewAttributeBreakdown } from "./ReviewAttributeBreakdown";
import { ReviewMediaGalleryStrip } from "./ReviewMediaGalleryStrip";

const REVIEWS_FETCH_TIMEOUT_MS = 15_000;

interface ProductReviewsSectionProps {
  product: Product;
  locale: string;
  sort: ProductReviewSort;
  filters?: ProductReviewListFilters;
  layout?:
    | "summary"
    | "full"
    | "carousel"
    | "gallery"
    | "highlights"
    | "attributes";
  /** Under the gallery in the classic Etsy-style PDP column. */
  embedded?: boolean;
}

export async function ProductReviewsSection({
  product,
  locale,
  sort,
  filters = {},
  layout = "full",
  embedded = false,
}: ProductReviewsSectionProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "reviews",
  });

  const previewLimit = embedded ? PDP_PREVIEW_REVIEW_LIMIT : 10;
  const pageLimit = embedded ? previewLimit : 10;
  const aggregateReviewCount = product.reviews_count ?? 0;

  const emptyReviewsPage = {
    data: [],
    meta: {
      count: 0,
      page: 1,
      limit: previewLimit,
      pages: 0,
      from: 0,
      to: 0,
      in: 0,
      previous: null,
      next: null,
    },
  };

  const reviewsPage = await promiseWithTimeout(
    getProductReviews(product.slug, {
      ...buildReviewListQuery(sort, filters, pageLimit),
      sort,
    }),
    REVIEWS_FETCH_TIMEOUT_MS,
    emptyReviewsPage,
  );

  const totalCount = resolveProductReviewCount(
    reviewsPage.meta?.count,
    aggregateReviewCount,
    reviewsPage.data.length,
  );
  const totalPages = Math.max(
    reviewsPage.meta?.pages ?? 1,
    Math.ceil(totalCount / pageLimit),
    1,
  );
  const currentPage = reviewsPage.meta?.page ?? filters.page ?? 1;
  const reportedReviewCount = reviewsPage.meta?.count ?? aggregateReviewCount;
  const hasActiveReviewFilter = Boolean(
    filters.rating || filters.withMedia || filters.keyword,
  );
  const shouldFetchReviewSummary =
    embedded &&
    !hasActiveReviewFilter &&
    (filters.page ?? 1) === 1 &&
    totalCount > reviewsPage.data.length &&
    totalCount <= 100 &&
    (product.average_rating == null ||
      Object.keys(product.rating_distribution ?? {}).length === 0 ||
      product.average_item_quality_rating == null ||
      product.average_shipping_rating == null ||
      product.average_customer_service_rating == null ||
      product.recommendation_rate == null);
  const reviewSummaryPage = shouldFetchReviewSummary
    ? await promiseWithTimeout(
        getProductReviews(product.slug, {
          sort: "newest",
          limit: totalCount,
          page: 1,
        }),
        REVIEWS_FETCH_TIMEOUT_MS,
        emptyReviewsPage,
      )
    : reviewsPage;
  const summaryReviews = reviewSummaryPage.data;
  const summaryIsComplete =
    summaryReviews.length >= totalCount && totalCount > 0;
  const averageOf = (field: keyof (typeof summaryReviews)[number]) => {
    const values = summaryReviews
      .map((review) => review[field])
      .filter((value) => value != null)
      .map(Number)
      .filter(Number.isFinite);
    return summaryIsComplete && values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  };
  const recommendationValues = summaryReviews
    .map((review) => review.recommended)
    .filter((value): value is boolean => typeof value === "boolean");
  const summaryMetrics = {
    itemQuality: averageOf("item_quality_rating"),
    shipping: averageOf("shipping_rating"),
    customerService: averageOf("customer_service_rating"),
    recommendationRate:
      summaryIsComplete && recommendationValues.length > 0
        ? (recommendationValues.filter(Boolean).length /
            recommendationValues.length) *
          100
        : null,
  };
  const ratingDistribution = summaryIsComplete
    ? summaryReviews.reduce<Record<string, number>>((counts, review) => {
        const rating = String(Math.round(review.rating));
        counts[rating] = (counts[rating] ?? 0) + 1;
        return counts;
      }, {})
    : product.rating_distribution;
  const pageAverage =
    !hasActiveReviewFilter &&
    (filters.page ?? 1) === 1 &&
    reportedReviewCount > 0 &&
    reportedReviewCount === reviewsPage.data.length &&
    reviewsPage.data.length > 0
      ? reviewsPage.data.reduce((sum, review) => sum + review.rating, 0) /
        reviewsPage.data.length
      : null;
  const summaryAverage = summaryIsComplete
    ? summaryReviews.reduce((sum, review) => sum + review.rating, 0) /
      summaryReviews.length
    : null;
  const averageRating = product.average_rating ?? summaryAverage ?? pageAverage;
  const hasSummary = totalCount > 0 && averageRating != null;
  const reviewCardVariant = embedded ? "etsy" : "list";

  const attributeScores =
    embedded && totalCount > 0
      ? await getProductReviewAttributeScores(product.slug)
      : [];

  const mediaReviewCount = (summaryIsComplete ? summaryReviews : []).filter(
    (review) =>
      (review.images?.length ?? 0) > 0 || (review.videos?.length ?? 0) > 0,
  ).length;

  const etsyTopicChips =
    embedded && totalCount > 0
      ? buildEtsyTopicChipDefs(
          product,
          attributeScores,
          mediaReviewCount,
          {
            filterWithMedia: t("filterWithMedia"),
            filterTopicCount: (label, count) =>
              t("filterTopicCount", { label, count }),
            filterStarsCount: (stars, count) =>
              t("filterStarsCount", { stars, count }),
          },
          ratingDistribution,
        )
      : [];

  return (
    <>
      <ProductReviewStructuredData
        product={product}
        reviews={reviewsPage.data}
      />
      <section
        id="reviews"
        className={
          embedded
            ? hasSummary || reviewsPage.data.length > 0
              ? "border-t border-[#e1e3df] bg-[#fbf9f7] px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
              : "border-t border-marketplace-border-subtle py-7 sm:py-8"
            : "container mx-auto border-t border-marketplace-border-subtle px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
        }
      >
        <ProductReviewsSectionHeader
          product={product}
          locale={locale}
          reviewCount={totalCount}
          averageRating={averageRating}
          embedded={embedded}
        />

        {embedded && hasSummary ? (
          <ProductReviewsBuyerHighlights
            locale={locale}
            attributeScores={attributeScores}
          />
        ) : null}

        {hasSummary && layout !== "gallery" ? (
          embedded ? (
            <div className="mt-5">
              <RatingScoreRings
                product={product}
                locale={locale}
                metrics={summaryMetrics}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-marketplace-border-subtle bg-marketplace-surface-warm p-5 sm:mt-8 sm:p-6">
              <RatingDistribution
                product={product}
                locale={locale}
                variant="card"
              />
              {layout === "attributes" || layout === "full" ? (
                <ReviewAttributeBreakdown
                  productSlug={product.slug}
                  locale={locale}
                  embedded={false}
                />
              ) : null}
            </div>
          )
        ) : reviewsPage.data.length === 0 ? (
          <ProductReviewsEmptyState
            heading={t("emptyProductHeading")}
            description={t("emptyProductIncentive")}
          />
        ) : null}

        {reviewsPage.data.length > 0 && layout !== "summary" ? (
          <>
            {layout === "gallery" ? (
              <ReviewMediaGalleryStrip reviews={reviewsPage.data} />
            ) : null}
            {embedded ? (
              <div className="mt-5">
                <Suspense fallback={null}>
                  <ProductReviewsEtsyFilters
                    currentSort={sort}
                    topicChips={etsyTopicChips}
                  />
                </Suspense>
              </div>
            ) : layout === "full" ? (
              <div className="mt-6 space-y-4 rounded-2xl border border-marketplace-border-subtle bg-marketplace-surface p-4 shadow-sm sm:p-5">
                <Suspense fallback={null}>
                  <ProductReviewsFilters currentSort={sort} />
                </Suspense>
                <Suspense fallback={null}>
                  <ProductReviewsSort current={sort} />
                </Suspense>
              </div>
            ) : null}
            <div className={embedded ? "mt-5" : "mt-6 sm:mt-8"}>
              {embedded || layout === "carousel" ? (
                <ProductReviewsList
                  productSlug={product.slug}
                  sort={sort}
                  previewReviews={reviewsPage.data}
                  totalCount={totalCount}
                  cardVariant={reviewCardVariant}
                  etsyLayout={embedded}
                />
              ) : (
                <div className="space-y-4">
                  {reviewsPage.data.map((review) => (
                    <ProductReviewCardView
                      key={review.id}
                      review={review}
                      productSlug={product.slug}
                      variant={reviewCardVariant}
                      showVerifiedPurchase={false}
                    />
                  ))}
                </div>
              )}
            </div>
            {!embedded && totalPages > 1 ? (
              <nav
                className="mt-8 flex justify-center gap-2 text-sm"
                aria-label={t("pagination")}
              >
                {currentPage > 1 ? (
                  <a
                    href={buildReviewListHref(sort, filters, currentPage - 1)}
                    className="rounded-full border border-marketplace-border px-4 py-2 font-medium text-marketplace-foreground transition-colors hover:bg-marketplace-muted"
                  >
                    {t("previousPage")}
                  </a>
                ) : null}
                <span className="px-2 py-2 text-marketplace-muted-foreground">
                  {t("pageOf", { page: currentPage, total: totalPages })}
                </span>
                {currentPage < totalPages ? (
                  <a
                    href={buildReviewListHref(sort, filters, currentPage + 1)}
                    className="rounded-full border border-marketplace-border px-4 py-2 font-medium text-marketplace-foreground transition-colors hover:bg-marketplace-muted"
                  >
                    {t("nextPage")}
                  </a>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    </>
  );
}
