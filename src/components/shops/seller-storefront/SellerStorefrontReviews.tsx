import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyStateIllustration } from "@/components/empty-states/EmptyStateIllustration";
import { getSellerReviews } from "@/lib/data/sellers";
import { buildAccountLoginHref } from "@/lib/utils/account-redirect";
import {
  sellerShopPath,
  sellerShopShellClass,
} from "@/lib/utils/seller-storefront";
import { SellerRatingSummary } from "./SellerRatingSummary";
import { SellerShopRatingSummary } from "./SellerShopRatingSummary";
import { SellerShopReviewCard } from "./SellerShopReviewCard";
import { SellerShopReviewSortForm } from "./SellerShopReviewSortForm";

interface SellerStorefrontReviewsProps {
  slug: string;
  basePath: string;
  locale: string;
  page: number;
  sort?: string;
  averageRating: number | null;
  reviewsCount: number;
  distribution?: Record<string, number> | null;
}

export async function SellerStorefrontReviews({
  slug,
  basePath,
  locale,
  page,
  sort,
  averageRating,
  reviewsCount,
  distribution,
}: SellerStorefrontReviewsProps) {
  const [t, tReviews] = await Promise.all([
    getTranslations("sellers"),
    getTranslations("reviews"),
  ]);
  const reviewsPath = sellerShopPath(basePath, slug, "reviews");
  const reportLoginHref = buildAccountLoginHref(basePath, reviewsPath);
  const reviewSort =
    sort === "newest" || sort === "highest" || sort === "lowest"
      ? sort
      : undefined;
  const reviews = await getSellerReviews(slug, page, 10, reviewSort);
  const visiblePageNumbers = Array.from(
    new Set(
      [1, page - 1, page, page + 1, reviews.meta.pages].filter(
        (pageNumber) => pageNumber >= 1 && pageNumber <= reviews.meta.pages,
      ),
    ),
  ).sort((a, b) => a - b);
  const paginationItems: Array<number | string> = [];
  visiblePageNumbers.forEach((pageNumber, index) => {
    if (index > 0 && pageNumber - visiblePageNumbers[index - 1] > 1) {
      paginationItems.push(`ellipsis-${pageNumber}`);
    }
    paginationItems.push(pageNumber);
  });

  return (
    <div className={`${sellerShopShellClass} bg-[#faf9f7] py-8 md:py-12`}>
      <div className="flex flex-col gap-4 border-b border-[#e8e3df] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#26221f]">
            {t("tab_reviews")}
          </h1>
          {reviewsCount > 0 ? (
            <p className="mt-1 text-sm text-[#6c655e]">
              {tReviews("reviewCount", { count: reviewsCount })}
            </p>
          ) : null}
        </div>
        {reviewsCount > 0 ? (
          <SellerShopReviewSortForm action={reviewsPath} sort={reviewSort} />
        ) : null}
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)] lg:gap-8">
        <aside className="mb-6 h-fit lg:sticky lg:top-6 lg:mb-0">
          <SellerShopRatingSummary
            locale={locale}
            averageRating={averageRating}
            reviewsCount={reviewsCount}
          />
          {distribution && reviewsCount > 0 ? (
            <div className="mt-5 border-t border-[#eee9e4] pt-4">
              <SellerRatingSummary
                locale={locale}
                averageRating={averageRating}
                reviewsCount={reviewsCount}
                distribution={distribution}
                barsOnly
              />
            </div>
          ) : null}
        </aside>

        <div className="min-w-0">
          {reviews.data.length ? (
            <div className="flex flex-col">
              {reviews.data.map((review) => (
                <SellerShopReviewCard
                  key={review.id}
                  review={review}
                  locale={locale}
                  basePath={basePath}
                  reportLoginHref={reportLoginHref}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#d8d1ca] bg-white px-5 py-14 text-center text-sm text-[#595959]">
              <EmptyStateIllustration
                name="no-reviews-yet"
                className="mx-auto mb-3 text-gray-600"
              />
              <p>{t("noReviews")}</p>
            </div>
          )}
        </div>
      </div>

      {reviews.meta.pages > 1 ? (
        <nav
          className="mt-8 flex items-center justify-center gap-2"
          aria-label={t("reviewsPages")}
        >
          {page > 1 ? (
            <a
              href={sellerShopPath(basePath, slug, "reviews", {
                page: String(page - 1),
                sort: reviewSort,
              })}
              aria-label={t("previous")}
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </a>
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#c0b9b3]"
            >
              <ChevronLeft className="size-4" />
            </span>
          )}
          {paginationItems.map((pageItem) =>
            typeof pageItem === "string" ? (
              <span
                key={pageItem}
                aria-hidden="true"
                className="px-1 text-sm text-[#8a817a]"
              >
                …
              </span>
            ) : pageItem === page ? (
              <span
                key={pageItem}
                aria-current="page"
                className="inline-flex size-9 items-center justify-center rounded-full border border-[#39332e] bg-white text-sm font-semibold tabular-nums text-[#39332e]"
              >
                {pageItem}
              </span>
            ) : (
              <a
                key={pageItem}
                href={sellerShopPath(basePath, slug, "reviews", {
                  page: String(pageItem),
                  sort: reviewSort,
                })}
                aria-label={t("pageOf", {
                  page: pageItem,
                  pages: reviews.meta.pages,
                })}
                className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-sm font-medium tabular-nums text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
              >
                {pageItem}
              </a>
            ),
          )}
          {page < reviews.meta.pages ? (
            <a
              href={sellerShopPath(basePath, slug, "reviews", {
                page: String(page + 1),
                sort: reviewSort,
              })}
              aria-label={t("next")}
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
            >
              <ChevronRight className="size-4" aria-hidden />
            </a>
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#c0b9b3]"
            >
              <ChevronRight className="size-4" />
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
