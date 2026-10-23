import type { Product } from "@spree/sdk";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getProductReviews } from "@/lib/data/reviews";
import { promiseWithTimeout } from "@/lib/utils/promise-with-timeout";
import { ProductReviewCardView } from "./ProductReviewCardView";
import { ProductReviewStructuredData } from "./ProductReviewStructuredData";
import { ProductReviewsEmptyState } from "./ProductReviewsEmptyState";
import {
  PDP_PREVIEW_REVIEW_LIMIT,
  ProductReviewsList,
} from "./ProductReviewsList";
import {
  type ProductReviewSort,
  ProductReviewsSort,
} from "./ProductReviewsSort";
import { RatingDistribution } from "./RatingDistribution";

const REVIEWS_FETCH_TIMEOUT_MS = 5_000;

interface ProductReviewsSectionProps {
  product: Product;
  locale: string;
  sort: ProductReviewSort;
  /** Under the gallery in the classic Etsy-style PDP column. */
  embedded?: boolean;
}

export async function ProductReviewsSection({
  product,
  locale,
  sort,
  embedded = false,
}: ProductReviewsSectionProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "reviews",
  });

  const previewLimit = embedded ? PDP_PREVIEW_REVIEW_LIMIT : 10;
  const aggregateReviewCount = product.reviews_count ?? 0;
  const hasSummary = aggregateReviewCount > 0 && product.average_rating != null;

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

  const reviewsPage =
    aggregateReviewCount > 0
      ? await promiseWithTimeout(
          getProductReviews(product.slug, {
            sort,
            limit: previewLimit,
            page: 1,
          }),
          REVIEWS_FETCH_TIMEOUT_MS,
          emptyReviewsPage,
        )
      : emptyReviewsPage;

  const totalCount =
    reviewsPage.meta?.count ?? reviewsPage.data.length ?? aggregateReviewCount;
  const hasPublishedReviews = hasSummary || reviewsPage.data.length > 0;

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
            ? "border-t border-[#e1e3df] pt-10 pb-2"
            : "container mx-auto border-t border-[#e1e3df] px-4 py-10 sm:px-6 sm:py-12 lg:px-8"
        }
      >
        {hasPublishedReviews ? (
          <h2 className="text-[16px] font-semibold tracking-tight text-[#222] sm:text-lg">
            {t("title")}
          </h2>
        ) : null}

        {hasSummary ? (
          <div className="mt-5 border-b border-[#e1e3df] pb-6 sm:mt-6 sm:pb-7">
            <RatingDistribution
              product={product}
              locale={locale}
              variant={embedded ? "flat" : "card"}
            />
          </div>
        ) : (
          <ProductReviewsEmptyState
            heading={t("emptyProductHeading")}
            description={t("emptyProductIncentive")}
          />
        )}

        {reviewsPage.data.length > 0 ? (
          <>
            <div className="mt-5 sm:mt-6">
              <Suspense fallback={null}>
                <ProductReviewsSort current={sort} />
              </Suspense>
            </div>
            <div className="mt-5 sm:mt-6">
              {embedded ? (
                <ProductReviewsList
                  productSlug={product.slug}
                  sort={sort}
                  previewReviews={reviewsPage.data}
                  totalCount={totalCount}
                />
              ) : (
                reviewsPage.data.map((review) => (
                  <ProductReviewCardView key={review.id} review={review} />
                ))
              )}
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
