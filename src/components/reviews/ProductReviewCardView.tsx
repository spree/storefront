"use client";

import type { ProductReview } from "@spree/sdk";
import { BadgeCheck, Check, ThumbsDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/format";
import { extractBasePath } from "@/lib/utils/path";
import { ProductReviewReportButton } from "./ProductReviewReportButton";
import { ReviewHelpfulButton } from "./ReviewHelpfulButton";
import { ReviewMedia } from "./ReviewMedia";
import { StarRatingDisplay } from "./StarRating";

export const PREVIEW_REVIEW_BODY_MAX_CHARS = 280;

export function reviewBodyExceedsPreview(review: ProductReview): boolean {
  return (review.body?.length ?? 0) > PREVIEW_REVIEW_BODY_MAX_CHARS;
}

interface ProductReviewCardViewProps {
  review: ProductReview;
  productSlug?: string;
  compact?: boolean;
  showProductLink?: boolean;
  basePath?: string;
}

function ReviewerName({
  name,
  profileHref,
  profileAriaLabel,
}: {
  name: string;
  profileHref: string | null;
  profileAriaLabel: string | null;
}) {
  if (profileHref) {
    return (
      <Link
        href={profileHref}
        aria-label={profileAriaLabel ?? undefined}
        className="truncate text-sm font-semibold text-[#222] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand"
      >
        {name}
      </Link>
    );
  }

  return <p className="truncate text-sm font-semibold text-[#222]">{name}</p>;
}

export function ProductReviewCardView({
  review,
  productSlug,
  compact = false,
  showProductLink = false,
  basePath = "",
}: ProductReviewCardViewProps) {
  const t = useTranslations("reviews");
  const locale = useLocale();
  const pathname = usePathname();
  const localeBasePath = basePath || extractBasePath(pathname);

  const displayDate = review.published_at ?? review.created_at;
  const reviewer = review.customer_name?.trim() || t("anonymousReviewer");
  const reviewerProfileHref =
    review.customer_id && localeBasePath
      ? `${localeBasePath}/members/${review.customer_id}`
      : null;
  const detailRatings = [
    { label: t("itemQualityRating"), value: review.item_quality_rating },
    { label: t("shippingRating"), value: review.shipping_rating },
    {
      label: t("customerServiceRating"),
      value: review.customer_service_rating,
    },
  ].filter(
    (item): item is { label: string; value: number } => item.value != null,
  );
  const initials = reviewer
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase(locale);
  const isVerified = Boolean(review.line_item_id);
  const bodyTruncated = compact && reviewBodyExceedsPreview(review);

  return (
    <article className="min-w-0 border-b border-[#e1e3df] py-5 last:border-b-0">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f5f5f5] text-xs font-semibold text-[#222]"
          >
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <ReviewerName
              name={reviewer}
              profileHref={reviewerProfileHref}
              profileAriaLabel={
                reviewerProfileHref
                  ? t("viewReviewerProfile", { name: reviewer })
                  : null
              }
            />
            {isVerified ? (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#595959]">
                <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
                {t("verifiedPurchase")}
              </p>
            ) : null}
          </div>
        </div>
        <time
          dateTime={displayDate}
          className="shrink-0 text-xs text-[#595959]"
        >
          {formatDateTime(displayDate, locale)}
        </time>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StarRatingDisplay rating={review.rating} size="sm" tone="dark" />
        {review.recommended != null ? (
          <span className="text-xs text-[#595959]">
            {review.recommended ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3.5 text-[#222]" aria-hidden />
                {t("recommendPrompt")} {t("recommendYes")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <ThumbsDown className="size-3.5" aria-hidden />
                {t("recommendPrompt")} {t("recommendNo")}
              </span>
            )}
          </span>
        ) : null}
      </div>

      {review.title ? (
        <h3 className="mt-2 text-[15px] font-semibold leading-snug text-[#222]">
          {review.title}
        </h3>
      ) : null}

      {review.body ? (
        <p
          className={cn(
            "mt-1.5 text-sm leading-relaxed text-[#595959]",
            bodyTruncated
              ? "line-clamp-4 whitespace-pre-wrap"
              : "whitespace-pre-wrap",
          )}
        >
          {review.body}
        </p>
      ) : null}

      {!compact && detailRatings.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#595959]">
          {detailRatings.map(({ label, value }) => (
            <li key={label} className="inline-flex items-center gap-1.5">
              <span className="font-medium text-[#222]">{label}</span>
              <StarRatingDisplay rating={value} size="sm" tone="dark" />
            </li>
          ))}
        </ul>
      ) : null}

      {!compact && review.attribute_answers?.length ? (
        <ul className="mt-3 space-y-1.5 text-xs text-[#595959]">
          {review.attribute_answers.map((answer) => (
            <li key={answer.key} className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#222]">{answer.label}</span>
              {answer.kind === "rating_5" && answer.rating_value != null ? (
                <StarRatingDisplay
                  rating={answer.rating_value}
                  size="sm"
                  tone="dark"
                />
              ) : null}
              {answer.text_value ? <span>{answer.text_value}</span> : null}
              {answer.choice_values?.length ? (
                <span>{answer.choice_values.join(", ")}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {showProductLink && review.product_name && review.product_slug ? (
        <p className="mt-3 text-xs text-[#595959]">
          {t("productFallback")}:{" "}
          <Link
            href={`${basePath}/products/${review.product_slug}`}
            className="font-medium text-[#222] underline-offset-2 hover:underline"
          >
            {review.product_name}
          </Link>
        </p>
      ) : null}

      {!compact ? (
        <ReviewMedia images={review.images} videos={review.videos} />
      ) : null}

      {!compact && productSlug ? (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <ReviewHelpfulButton productSlug={productSlug} review={review} />
          <ProductReviewReportButton reviewId={review.id} />
        </div>
      ) : null}

      {!compact && review.seller_reply ? (
        <aside className="mt-4 rounded-lg border border-[#e1e3df] bg-[#faf9f7] px-3.5 py-3">
          <p className="text-xs font-semibold text-[#222]">
            {t("sellerResponse")}
            {review.seller_replied_at ? (
              <time
                dateTime={review.seller_replied_at}
                className="font-normal text-[#595959]"
              >
                {" "}
                · {formatDateTime(review.seller_replied_at, locale)}
              </time>
            ) : null}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#595959]">
            {review.seller_reply}
          </p>
          <ReviewMedia
            images={review.seller_reply_images}
            videos={review.seller_reply_videos}
          />
        </aside>
      ) : null}
    </article>
  );
}
