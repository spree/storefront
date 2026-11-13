import type { Policy, Seller } from "@spree/sdk";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketplaceEmptyState } from "@/components/marketplace";
import { SellerShopAnnouncement } from "@/components/shops/seller-storefront/SellerShopAnnouncement";
import type {
  SellerShopPagePayload,
  SellerShopSection,
} from "@/lib/data/seller-storefront-types";
import { getSellerProducts, getSellerReviews } from "@/lib/data/sellers";
import { buildAccountLoginHref } from "@/lib/utils/account-redirect";
import {
  sellerShopPath,
  sellerShopShellClass,
} from "@/lib/utils/seller-storefront";
import { SellerPersonalizedDiscoveryRail } from "./SellerPersonalizedDiscoveryRail";
import { SellerShopRatingSummary } from "./SellerShopRatingSummary";
import { SellerShopReviewCard } from "./SellerShopReviewCard";
import { SellerShopReviewSortForm } from "./SellerShopReviewSortForm";
import { SellerStorefrontAbout } from "./SellerStorefrontAbout";
import { SellerStorefrontPolicies } from "./SellerStorefrontPolicies";
import { SellerStorefrontProducts } from "./SellerStorefrontProducts";

interface SellerStorefrontHomeProps {
  slug: string;
  basePath: string;
  locale: string;
  sellerId: string;
  sections: SellerShopSection[];
  featuredIds: string[];
  aboutHtml?: string | null;
  about?: string | null;
  reviewsCount: number;
  featuredLayout?: "standard" | "mixed_grid" | "none";
  productCount?: number;
  policies?: Policy[];
  marketplaceName?: string;
  seller?: Seller;
  sellable?: boolean;
  onVacation?: boolean;
  page?: number;
  section?: string;
  query?: string;
  sort?: string;
  onSale?: string;
  reviewPage?: number;
  reviewSort?: string;
  reviewDistribution?: Record<string, number> | null;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  personalizable?: string;
  salesCount?: number;
  followersCount?: number;
  customOrderHref?: string;
  shopPath?: string;
  shopAnnouncement?: string | null;
  shopAnnouncementHtml?: string | null;
  editorPreview?: boolean;
  shopPage?: SellerShopPagePayload | null;
}

export async function SellerStorefrontHome({
  slug,
  basePath,
  locale,
  sellerId,
  sections,
  featuredIds,
  aboutHtml,
  about,
  reviewsCount,
  featuredLayout = "standard",
  productCount,
  policies = [],
  marketplaceName = "",
  seller,
  page = 1,
  section,
  query,
  sort,
  onSale,
  reviewPage = 1,
  reviewSort,
  reviewDistribution,
  minPrice,
  maxPrice,
  minRating,
  personalizable,
  salesCount,
  followersCount,
  customOrderHref,
  shopPath = `${basePath}/sellers/${slug}`,
  shopAnnouncement,
  shopAnnouncementHtml,
  editorPreview = false,
  shopPage,
}: SellerStorefrontHomeProps) {
  const t = await getTranslations("sellers");
  const tReviews = await getTranslations("reviews");
  const catalogCount =
    productCount ??
    (await getSellerProducts(slug, { sellerId, page: 1, limit: 1 })
      .then((result) => result.meta.count ?? 0)
      .catch(() => 0));
  const normalizedReviewSort =
    reviewSort === "newest" ||
    reviewSort === "highest" ||
    reviewSort === "lowest"
      ? reviewSort
      : undefined;
  const reviews =
    reviewsCount > 0
      ? await getSellerReviews(
          slug,
          reviewPage,
          10,
          normalizedReviewSort,
        ).catch(() => ({
          data: [],
          meta: { pages: 1, count: 0 },
        }))
      : { data: [], meta: { pages: 1, count: 0 } };
  const reviewPageCount = Math.max(
    reviews.meta.pages || Math.ceil((reviews.meta.count || reviewsCount) / 10),
    1,
  );
  const distributionRatings = Object.entries(reviewDistribution ?? {})
    .map(([rating, count]) => [Number(rating), Number(count)] as const)
    .filter(([rating, count]) => rating >= 1 && rating <= 5 && count > 0);
  const distributionCount = distributionRatings.reduce(
    (sum, [, count]) => sum + count,
    0,
  );
  const distributionAverage = distributionCount
    ? distributionRatings.reduce(
        (sum, [rating, count]) => sum + rating * count,
        0,
      ) / distributionCount
    : null;
  const loadedAverage = reviews.data.length
    ? reviews.data.reduce((sum, review) => sum + review.rating, 0) /
      reviews.data.length
    : null;
  const averageRating =
    seller?.average_rating ?? distributionAverage ?? loadedAverage;
  const hasAnnouncement = Boolean(
    shopAnnouncementHtml?.trim() || shopAnnouncement?.trim(),
  );

  return (
    <>
      {hasAnnouncement ? (
        <div id="shop-announcement">
          <SellerShopAnnouncement
            shopAnnouncement={shopAnnouncement}
            shopAnnouncementHtml={shopAnnouncementHtml}
          />
        </div>
      ) : null}

      {catalogCount > 0 ? (
        <>
          <SellerStorefrontProducts
            slug={slug}
            sellerId={sellerId}
            basePath={basePath}
            locale={locale}
            sections={sections}
            featuredIds={featuredIds}
            featuredLayout={featuredLayout}
            page={page}
            section={section}
            query={query}
            sort={sort}
            onSale={onSale}
            minPrice={minPrice}
            maxPrice={maxPrice}
            minRating={minRating}
            personalizable={personalizable}
            totalItemCount={catalogCount}
            salesCount={salesCount}
            followersCount={followersCount}
            customOrderHref={customOrderHref}
            shopPath={shopPath}
            marketplaceName={marketplaceName}
            editorPreview={editorPreview}
          />
          {page === 1 &&
          !section &&
          !query &&
          !onSale &&
          !minPrice &&
          !maxPrice &&
          !minRating &&
          !personalizable ? (
            <SellerPersonalizedDiscoveryRail
              sellerId={sellerId}
              slug={slug}
              basePath={basePath}
              locale={locale}
              excludeProductIds={featuredIds}
            />
          ) : null}
        </>
      ) : (
        <div className={`${sellerShopShellClass} py-12`} id="shop-items">
          <MarketplaceEmptyState
            illustration="no-listings-yet"
            title={t("emptyShopTitle")}
            description={t("emptyShopBody")}
          />
        </div>
      )}

      <section
        id="shop-reviews"
        className={`${sellerShopShellClass} border-t border-[#e3ddd8] bg-[#faf9f7] py-7`}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8e3df] pb-3">
          <div>
            <h2 className="text-lg font-semibold text-marketplace-foreground">
              {t("tab_reviews")}
            </h2>
            <p className="mt-1 text-sm text-marketplace-muted-foreground">
              {tReviews("reviewCount", { count: reviewsCount })}
            </p>
          </div>
          {reviewsCount > 0 ? (
            <SellerShopReviewSortForm
              action={shopPath}
              sort={normalizedReviewSort}
              tab="home"
              sortParam="review_sort"
            />
          ) : null}
        </div>
        {reviews.data.length ? (
          <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
            <aside className="border-b border-[#e8e3df] pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
              <SellerShopRatingSummary
                locale={locale}
                averageRating={averageRating}
                reviewsCount={reviewsCount}
              />
            </aside>
            <div className="min-w-0">
              <div className="flex flex-col">
                {reviews.data.map((review) => (
                  <SellerShopReviewCard
                    key={review.id}
                    review={review}
                    locale={locale}
                    basePath={basePath}
                    reportLoginHref={buildAccountLoginHref(
                      basePath,
                      sellerShopPath(basePath, slug, "reviews"),
                    )}
                  />
                ))}
              </div>
              {reviewPageCount > 1 ? (
                <nav
                  className="mt-7 flex items-center justify-center gap-2"
                  aria-label={tReviews("pagination")}
                >
                  {reviewPage > 1 ? (
                    <Link
                      href={sellerShopPath(basePath, slug, "home", {
                        review_page: String(reviewPage - 1),
                        review_sort: normalizedReviewSort,
                      })}
                      aria-label={tReviews("previousPage")}
                      className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#c0b9b3]"
                    >
                      <ChevronLeft className="size-4" />
                    </span>
                  )}
                  {Array.from(
                    { length: reviewPageCount },
                    (_, index) => index + 1,
                  ).map((pageNumber) =>
                    pageNumber === reviewPage ? (
                      <span
                        key={pageNumber}
                        aria-current="page"
                        className="inline-flex size-9 items-center justify-center rounded-full border border-[#39332e] bg-white text-sm font-semibold tabular-nums text-[#39332e]"
                      >
                        {pageNumber}
                      </span>
                    ) : (
                      <Link
                        key={pageNumber}
                        href={sellerShopPath(basePath, slug, "home", {
                          review_page: String(pageNumber),
                          review_sort: normalizedReviewSort,
                        })}
                        aria-label={tReviews("pageOf", {
                          page: pageNumber,
                          total: reviewPageCount,
                        })}
                        className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-sm font-medium tabular-nums text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
                      >
                        {pageNumber}
                      </Link>
                    ),
                  )}
                  {reviewPage < reviewPageCount ? (
                    <Link
                      href={sellerShopPath(basePath, slug, "home", {
                        review_page: String(reviewPage + 1),
                        review_sort: normalizedReviewSort,
                      })}
                      aria-label={tReviews("nextPage")}
                      className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
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
          </div>
        ) : (
          <p className="text-sm text-marketplace-muted-foreground">
            {t("noReviews")}
          </p>
        )}
      </section>
      <div
        id="shop-about"
        className="border-t border-marketplace-border-subtle"
      >
        <SellerStorefrontAbout
          shopName={seller?.name ?? slug}
          marketplaceName={marketplaceName}
          sellerSince={seller?.seller_since}
          tagline={seller?.tagline}
          aboutHtml={aboutHtml}
          about={about}
          salesCount={salesCount}
          accentColor={seller?.shop_accent_color}
          shopPage={shopPage}
          editorPreview={editorPreview}
        />
      </div>
      <div
        id="shop-policies"
        className="border-t border-marketplace-border-subtle"
      >
        <SellerStorefrontPolicies
          policies={policies}
          marketplaceName={marketplaceName}
          seller={seller}
          editorPreview={editorPreview}
        />
      </div>
    </>
  );
}
