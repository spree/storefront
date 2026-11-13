"use client";

import type { ProductReview } from "@spree/sdk";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getProductReviews } from "@/lib/data/reviews";
import {
  ProductReviewCardView,
  reviewBodyExceedsPreview,
} from "./ProductReviewCardView";
import { ProductReviewsSectionFooter } from "./ProductReviewsSectionFooter";
import type { ProductReviewSort } from "./ProductReviewsSort";
import { PDP_PREVIEW_REVIEW_LIMIT } from "./product-review-list-filters";

export { PDP_PREVIEW_REVIEW_LIMIT };

type ProductReviewsListProps = {
  productSlug: string;
  sort: ProductReviewSort;
  previewReviews: ProductReview[];
  totalCount: number;
  cardVariant?: "card" | "list" | "etsy";
  etsyLayout?: boolean;
};

export function ProductReviewsList({
  productSlug,
  sort,
  previewReviews,
  totalCount,
  cardVariant = "card",
  etsyLayout = false,
}: ProductReviewsListProps) {
  const t = useTranslations("reviews");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allReviews, setAllReviews] = useState<ProductReview[] | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMoreReviews = totalCount > previewReviews.length;
  const hasLongPreview = previewReviews.some(reviewBodyExceedsPreview);
  const showViewAll =
    hasMoreReviews ||
    hasLongPreview ||
    (etsyLayout && totalCount > previewReviews.length);

  useEffect(() => {
    setAllReviews(null);
  }, [sort, productSlug]);

  useEffect(() => {
    if (!drawerOpen) return;
    if (allReviews !== null) return;

    let cancelled = false;
    setLoading(true);
    getProductReviews(productSlug, {
      sort,
      limit: Math.max(1, Math.min(totalCount, 100)),
      page: 1,
    })
      .then((page) => {
        if (!cancelled) setAllReviews(page.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [drawerOpen, allReviews, productSlug, sort, totalCount]);

  const drawerReviews = allReviews ?? previewReviews;

  return (
    <>
      <div className={etsyLayout ? "flex flex-col" : "flex flex-col gap-3"}>
        {previewReviews.map((review) => (
          <ProductReviewCardView
            key={review.id}
            review={review}
            productSlug={productSlug}
            compact
            variant={cardVariant}
            showVerifiedPurchase={false}
          />
        ))}
      </div>

      {etsyLayout ? (
        <div className="mt-7 grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="sm:justify-self-start">
            <ProductReviewsSectionFooter />
          </div>
          {showViewAll ? (
            <Button
              type="button"
              variant="outline"
              className="mx-auto h-11 w-fit rounded-full border-[#514751] bg-transparent px-7 text-sm font-semibold text-[#373139] shadow-none hover:bg-white sm:col-start-2"
              onClick={() => setDrawerOpen(true)}
            >
              {t("viewAllReviewsForItem")}
            </Button>
          ) : (
            <span className="hidden sm:block sm:col-start-2" />
          )}
        </div>
      ) : showViewAll ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-marketplace-brand px-6 text-sm font-medium text-marketplace-brand hover:bg-marketplace-muted"
            onClick={() => setDrawerOpen(true)}
          >
            {t("viewAllReviews", { count: totalCount })}
          </Button>
        </div>
      ) : null}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="shrink-0 border-b border-marketplace-border-subtle px-5 py-4 text-left">
            <SheetTitle className="text-lg font-semibold text-marketplace-foreground">
              {t("pdpTitle")}
            </SheetTitle>
            <p className="text-sm font-normal text-marketplace-muted-foreground">
              {t("reviewCount", { count: totalCount })}
            </p>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            {loading && allReviews === null ? (
              <div
                className="flex items-center justify-center gap-2 py-16 text-sm text-marketplace-muted-foreground"
                role="status"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("loadingReviews")}
              </div>
            ) : (
              <div className="space-y-4">
                {drawerReviews.map((review) => (
                  <ProductReviewCardView
                    key={review.id}
                    review={review}
                    productSlug={productSlug}
                    variant={etsyLayout ? "etsy" : "card"}
                    showVerifiedPurchase={false}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
