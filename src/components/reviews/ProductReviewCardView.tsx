"use client";

import type { ProductReview } from "@spree/sdk";
import { BadgeCheck, Check, Store, ThumbsDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ProductImage } from "@/components/ui/product-image";
import { cn } from "@/lib/utils";
import { formatDateTime, formatShopReviewDate } from "@/lib/utils/format";
import { extractBasePath } from "@/lib/utils/path";
import { ProductReviewReportButton } from "./ProductReviewReportButton";
import { ReviewHelpfulButton } from "./ReviewHelpfulButton";
import { ReviewMedia } from "./ReviewMedia";
import { flattenReviewMedia } from "./review-media-items";
import { StarRatingDisplay } from "./StarRating";

export const PREVIEW_REVIEW_BODY_MAX_CHARS = 280;

export function reviewBodyExceedsPreview(review: ProductReview): boolean {
  return (review.body?.length ?? 0) > PREVIEW_REVIEW_BODY_MAX_CHARS;
}

interface ProductReviewCardViewProps {
  review: ProductReview;
  productSlug?: string;
  compact?: boolean;
  showVerifiedPurchase?: boolean;
  /** Card surfaces for PDP lists; etsy is flat dividers on the product page. */
  variant?: "card" | "list" | "etsy";
  showProductLink?: boolean;
  basePath?: string;
}

function ReviewerName({
  name,
  profileHref,
  profileAriaLabel,
  plain = false,
}: {
  name: string;
  profileHref: string | null;
  profileAriaLabel: string | null;
  plain?: boolean;
}) {
  const plainClass = "truncate text-[13px] font-normal text-[#222]";
  const defaultClass =
    "truncate text-sm font-semibold text-marketplace-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand";

  if (profileHref) {
    return (
      <Link
        href={profileHref}
        aria-label={profileAriaLabel ?? undefined}
        className={plain ? plainClass : defaultClass}
      >
        {name}
      </Link>
    );
  }

  return <p className={plain ? plainClass : defaultClass}>{name}</p>;
}

export function ProductReviewCardView({
  review,
  productSlug,
  compact = false,
  showVerifiedPurchase = true,
  variant = "list",
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
  const useCard = variant === "card";
  const useEtsy = variant === "etsy";
  const mediaItems = flattenReviewMedia(review.images, review.videos);
  const previewThumb = compact && useEtsy ? mediaItems[0] : null;

  if (useEtsy) {
    return (
      <article className="border-b border-[#e2ddd8] py-4 last:border-b-0 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <StarRatingDisplay rating={review.rating} size="xs" tone="amber" />
            <span
              className="text-sm font-medium tabular-nums text-[#302a31]"
              aria-hidden="true"
            >
              {review.rating}
            </span>
          </div>
          <div className="ml-auto flex min-w-0 max-w-full items-center gap-1.5 text-[13px]">
            <span
              aria-hidden="true"
              className="grid size-4 shrink-0 place-items-center rounded-full bg-[#d8eadc] text-[8px] font-semibold text-[#315d3d]"
            >
              {initials || "?"}
            </span>
            <ReviewerName
              name={reviewer}
              profileHref={reviewerProfileHref}
              profileAriaLabel={
                reviewerProfileHref
                  ? t("viewReviewerProfile", { name: reviewer })
                  : null
              }
              plain
            />
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

        {review.body ? (
          <p
            className={cn(
              "mt-1.5 text-[15px] leading-[1.4] text-[#403a42]",
              bodyTruncated
                ? "line-clamp-6 whitespace-pre-wrap"
                : "whitespace-pre-wrap",
            )}
          >
            {review.body}
          </p>
        ) : null}

        {previewThumb ? (
          <div className="relative mt-3 size-20 overflow-hidden rounded-md bg-[#f0edeb] sm:float-right sm:ml-4 sm:mt-1">
            <ProductImage
              src={previewThumb.url}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        ) : null}

        {!compact && mediaItems.length > 0 ? (
          <ReviewMedia images={review.images} videos={review.videos} />
        ) : null}

        {review.seller_reply ? (
          <aside className="mt-3 border-l-2 border-[#b76548] pl-3.5">
            <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Store
                className="size-3.5 shrink-0 text-[#9a553b]"
                aria-hidden="true"
              />
              <span className="text-[13px] font-semibold text-[#302a31]">
                {t("sellerResponse")}
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
            <p
              className={cn(
                "mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#514a4f]",
                compact && "line-clamp-4",
              )}
            >
              {review.seller_reply}
            </p>
          </aside>
        ) : null}

        {!compact && productSlug ? (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <ReviewHelpfulButton productSlug={productSlug} review={review} />
            <ProductReviewReportButton reviewId={review.id} />
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "min-w-0",
        useCard
          ? "rounded-2xl border border-marketplace-border-subtle bg-marketplace-surface-elevated p-4 shadow-sm sm:p-5"
          : "border-b border-marketplace-border-subtle py-5 last:border-b-0",
        compact && useCard && "p-3.5 sm:p-4",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-marketplace-muted text-xs font-semibold text-marketplace-foreground"
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
            {showVerifiedPurchase && isVerified ? (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-marketplace-muted-foreground">
                <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
                {t("verifiedPurchase")}
              </p>
            ) : null}
          </div>
        </div>
        <time
          dateTime={displayDate}
          className="shrink-0 text-xs text-marketplace-muted-foreground"
        >
          {formatDateTime(displayDate, locale)}
        </time>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StarRatingDisplay rating={review.rating} size="sm" tone="dark" />
        {review.recommended != null ? (
          <span className="text-xs text-marketplace-muted-foreground">
            {review.recommended ? (
              <span className="inline-flex items-center gap-1">
                <Check
                  className="size-3.5 text-marketplace-foreground"
                  aria-hidden
                />
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
        <h3 className="mt-2 text-[15px] font-semibold leading-snug text-marketplace-foreground">
          {review.title}
        </h3>
      ) : null}

      {review.body ? (
        <p
          className={cn(
            "mt-1.5 text-sm leading-relaxed text-marketplace-muted-foreground",
            bodyTruncated
              ? "line-clamp-4 whitespace-pre-wrap"
              : "whitespace-pre-wrap",
          )}
        >
          {review.body}
        </p>
      ) : null}

      {!compact && detailRatings.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-marketplace-muted-foreground">
          {detailRatings.map(({ label, value }) => (
            <li key={label} className="inline-flex items-center gap-1.5">
              <span className="font-medium text-marketplace-foreground">
                {label}
              </span>
              <StarRatingDisplay rating={value} size="sm" tone="dark" />
            </li>
          ))}
        </ul>
      ) : null}

      {!compact && review.attribute_answers?.length ? (
        <ul className="mt-3 space-y-1.5 text-xs text-marketplace-muted-foreground">
          {review.attribute_answers.map((answer) => (
            <li key={answer.key} className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-marketplace-foreground">
                {answer.label}
              </span>
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
        <p className="mt-3 text-xs text-marketplace-muted-foreground">
          {t("productFallback")}:{" "}
          <Link
            href={`${basePath}/products/${review.product_slug}`}
            className="font-medium text-marketplace-foreground underline-offset-2 hover:underline"
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

      {review.seller_reply ? (
        <aside
          className={cn(
            "border-l-[3px] border-marketplace-brand bg-marketplace-surface-warm",
            compact ? "mt-3 px-3 py-2.5" : "mt-4 px-3.5 py-3",
          )}
        >
          <p className="text-xs font-semibold text-marketplace-foreground">
            {t("sellerResponse")}
            {review.seller_replied_at ? (
              <time
                dateTime={review.seller_replied_at}
                className="font-normal text-marketplace-muted-foreground"
              >
                {" "}
                · {formatDateTime(review.seller_replied_at, locale)}
              </time>
            ) : null}
          </p>
          <p
            className={cn(
              "mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-marketplace-muted-foreground",
              compact && "line-clamp-4",
            )}
          >
            {review.seller_reply}
          </p>
          {!compact ? (
            <ReviewMedia
              images={review.seller_reply_images}
              videos={review.seller_reply_videos}
            />
          ) : null}
        </aside>
      ) : null}
    </article>
  );
}
