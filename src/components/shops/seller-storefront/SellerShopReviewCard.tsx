import type { ProductReview } from "@spree/sdk";
import { Store } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ReviewMedia } from "@/components/reviews/ReviewMedia";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { formatDateTime, formatShopReviewDate } from "@/lib/utils/format";
import { SellerShopReviewReportButton } from "./SellerShopReviewReportButton";

interface SellerShopReviewCardProps {
  review: ProductReview;
  locale: string;
  basePath: string;
  reportLoginHref: string;
}

export async function SellerShopReviewCard({
  review,
  locale,
  basePath,
  reportLoginHref,
}: SellerShopReviewCardProps) {
  const tReviews = await getTranslations({
    locale: locale as Locale,
    namespace: "reviews",
  });
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "sellers",
  });

  const displayDate = review.published_at ?? review.created_at;
  const reviewer =
    review.customer_name?.trim() || tReviews("anonymousReviewer");
  const reviewerProfileHref = review.customer_id
    ? `${basePath}/members/${review.customer_id}`
    : null;
  const productHref = review.product_slug
    ? `${basePath}/products/${review.product_slug}`
    : null;
  const initials = reviewer
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase(locale);

  return (
    <article className="border-b border-[#e2ddd8] py-4 last:border-b-0 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <StarRatingDisplay rating={review.rating} size="xs" tone="amber" />
        <div className="ml-auto flex min-w-0 max-w-full items-center gap-1.5 text-[13px]">
          <span
            aria-hidden="true"
            className="grid size-4 shrink-0 place-items-center rounded-full bg-[#d8eadc] text-[8px] font-semibold text-[#315d3d]"
          >
            {initials || "?"}
          </span>
          {reviewerProfileHref ? (
            <Link
              href={reviewerProfileHref}
              aria-label={tReviews("viewReviewerProfile", { name: reviewer })}
              className="truncate text-[13px] text-[#222] underline-offset-2 hover:underline"
            >
              {reviewer}
            </Link>
          ) : (
            <span className="truncate text-[13px] text-[#222]">{reviewer}</span>
          )}
          <span aria-hidden="true" className="text-[#b5adb2]">
            |
          </span>
          <time
            dateTime={displayDate}
            className="shrink-0 text-xs text-[#716a70]"
          >
            {formatShopReviewDate(displayDate, locale)}
          </time>
        </div>
      </div>

      {review.body || review.title ? (
        <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.4] text-[#403a42]">
          {review.body || review.title}
        </p>
      ) : null}

      {review.product_name && productHref ? (
        <p className="mt-2 text-xs text-[#716a70]">
          {t("makerPurchasedLabel")}:{" "}
          <Link
            href={productHref}
            className="text-[#514751] underline decoration-[#aaa2a0] underline-offset-2 hover:text-[#242025]"
          >
            {review.product_name}
          </Link>
        </p>
      ) : null}

      {review.images?.length || review.videos?.length ? (
        <ReviewMedia images={review.images} videos={review.videos} />
      ) : null}

      {review.seller_reply ? (
        <aside className="mt-3 border-l-2 border-[#b76548] pl-3.5">
          <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Store className="size-3.5 shrink-0 text-[#9a553b]" aria-hidden />
            <span className="text-[13px] font-semibold text-[#302a31]">
              {tReviews("sellerResponse")}
            </span>
            {review.seller_replied_at ? (
              <time
                dateTime={review.seller_replied_at}
                className="text-xs text-[#756e74]"
              >
                <span aria-hidden="true" className="mr-2 text-[#c5bbb6]">
                  ·
                </span>
                {formatDateTime(review.seller_replied_at, locale)}
              </time>
            ) : null}
          </header>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#514a4f]">
            {review.seller_reply}
          </p>
          {review.seller_reply_images?.length ||
          review.seller_reply_videos?.length ? (
            <ReviewMedia
              images={review.seller_reply_images}
              videos={review.seller_reply_videos}
            />
          ) : null}
        </aside>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1">
        <SellerShopReviewReportButton
          reviewId={review.id}
          loginHref={reportLoginHref}
        />
      </div>
    </article>
  );
}
