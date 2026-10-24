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
import type { ProductReviewSort } from "./ProductReviewsSort";
import { PDP_PREVIEW_REVIEW_LIMIT } from "./product-review-list-filters";

export { PDP_PREVIEW_REVIEW_LIMIT };

type ProductReviewsListProps = {
  productSlug: string;
  sort: ProductReviewSort;
  previewReviews: ProductReview[];
  totalCount: number;
};

export function ProductReviewsList({
  productSlug,
  sort,
  previewReviews,
  totalCount,
}: ProductReviewsListProps) {
  const t = useTranslations("reviews");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allReviews, setAllReviews] = useState<ProductReview[] | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMoreReviews = totalCount > previewReviews.length;
  const hasLongPreview = previewReviews.some(reviewBodyExceedsPreview);
  const showViewAll = hasMoreReviews || hasLongPreview;

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
      <div>
        {previewReviews.map((review) => (
          <ProductReviewCardView key={review.id} review={review} compact />
        ))}
      </div>

      {showViewAll ? (
        <div className="mt-2 flex justify-center border-t border-[#e1e3df] pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-[#222] px-6 text-sm font-medium text-[#222] hover:bg-[#f5f5f5]"
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
          <SheetHeader className="shrink-0 border-b border-[#e1e3df] px-5 py-4 text-left">
            <SheetTitle className="text-lg font-semibold text-[#222]">
              {t("title")}
            </SheetTitle>
            <p className="text-sm font-normal text-[#595959]">
              {t("reviewCount", { count: totalCount })}
            </p>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            {loading && allReviews === null ? (
              <div
                className="flex items-center justify-center gap-2 py-16 text-sm text-[#595959]"
                role="status"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("loadingReviews")}
              </div>
            ) : (
              drawerReviews.map((review) => (
                <ProductReviewCardView key={review.id} review={review} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
