"use client";

import type { Seller } from "@spree/sdk";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChevronDown } from "@/components/icons";
import { AskAboutProductButton } from "@/components/messages/AskAboutProductButton";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { FollowShopButton } from "@/components/shops/FollowShopButton";
import { StarSellerAvatar } from "@/components/shops/StarSellerAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getFollowStatuses } from "@/lib/data/follows";

interface ProductSellerIdentityProps {
  seller: Seller;
  basePath: string;
  showLogo?: boolean;
  showRating?: boolean;
  showVisitShop?: boolean;
  /** Richer PDP card with sales and ask-about CTA. */
  layout?: "inline" | "meet";
  productId?: string;
  productName?: string;
  messagingAvailable?: boolean | null;
}

export function ProductSellerIdentity({
  seller,
  basePath,
  showLogo = true,
  showRating = true,
  showVisitShop = true,
  layout = "inline",
  productId,
  productName,
  messagingAvailable,
}: ProductSellerIdentityProps) {
  const t = useTranslations("products");
  const th = useTranslations("home");
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [following, setFollowing] = useState(false);
  const shopHref = `${basePath}/sellers/${seller.slug}`;
  const showAsk =
    layout === "meet" && Boolean(productId) && Boolean(productName);
  const hasReviews =
    showRating && seller.reviews_count > 0 && seller.average_rating != null;

  useEffect(() => {
    if (layout !== "meet" || !isAuthenticated) return;
    let cancelled = false;
    getFollowStatuses([seller.id]).then((result) => {
      if (cancelled || !result.success) return;
      setFollowing(Boolean(result.data?.[seller.id]));
    });
    return () => {
      cancelled = true;
    };
  }, [layout, isAuthenticated, seller.id]);

  if (layout === "meet") {
    const followButtonClass =
      "h-9 shrink-0 rounded-full border-[#222] bg-transparent px-3 text-xs font-semibold text-[#222] shadow-none hover:bg-[#f5f5f5] sm:px-4 sm:text-sm";

    return (
      <details
        data-theme-product-seller
        className="group border-b border-[#e1e3df] py-4"
      >
        <summary className="cursor-pointer list-none text-[16px] font-semibold text-[#222] marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0">{t("meetTheMaker")}</span>
            <ChevronDown
              aria-hidden
              className="size-5 shrink-0 text-[#222] transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <FollowShopButton
              sellerId={seller.id}
              sellerSlug={seller.slug}
              initialFollowing={following}
              returnTo={pathname}
              className={followButtonClass}
            />
          </div>
          <div className="flex items-start gap-3 sm:gap-4">
            {showLogo ? (
              <StarSellerAvatar
                seller={seller}
                href={shopHref}
                sizeClassName="size-14"
                imageSizes="56px"
              />
            ) : null}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={shopHref}
                  className="block truncate text-lg font-medium text-marketplace-foreground transition-colors hover:text-marketplace-brand hover:underline"
                >
                  {seller.name}
                </Link>
              </div>
              {seller.tagline?.trim() ? (
                <p className="truncate text-sm text-marketplace-muted-foreground">
                  {seller.tagline.trim()}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-marketplace-muted-foreground">
                {hasReviews ? (
                  <span className="inline-flex items-center gap-1.5">
                    <StarRatingDisplay
                      rating={seller.average_rating!}
                      size="sm"
                    />
                    <span>({seller.reviews_count.toLocaleString()})</span>
                  </span>
                ) : null}
                {seller.sales_count > 0 ? (
                  <span>
                    {t("sellerSalesCount", { count: seller.sales_count })}
                  </span>
                ) : null}
                {(hasReviews || seller.sales_count > 0) &&
                seller.ships_from?.trim() ? (
                  <span aria-hidden>·</span>
                ) : null}
                {seller.ships_from?.trim() ? (
                  <span>{seller.ships_from.trim()}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {showVisitShop ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 rounded-full"
            >
              <Link href={shopHref}>{t("viewShop")}</Link>
            </Button>
          ) : null}
          {showAsk ? (
            <div className="flex-1 [&_button]:rounded-full">
              <AskAboutProductButton
                basePath={basePath}
                productId={productId!}
                productName={productName!}
                messagingAvailable={messagingAvailable !== false}
              />
            </div>
          ) : null}
        </div>
      </details>
    );
  }

  if (!showLogo && !showVisitShop) {
    return (
      <div data-theme-product-seller className="space-y-1">
        <p className="text-sm text-marketplace-muted-foreground">
          {t("soldBy")}{" "}
          <Link
            href={shopHref}
            className="font-medium text-marketplace-foreground hover:underline"
          >
            {seller.name}
          </Link>
        </p>
        {hasReviews ? (
          <p className="text-sm text-marketplace-muted-foreground">
            {seller.average_rating!.toFixed(1)} ({seller.reviews_count})
          </p>
        ) : null}
        {productId && productName ? (
          <AskAboutProductButton
            basePath={basePath}
            productId={productId}
            productName={productName}
            messagingAvailable={messagingAvailable !== false}
            buttonClassName="h-9 w-fit justify-start px-3"
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-theme-product-seller
      className="flex items-center gap-3 rounded-[var(--marketplace-radius-md)] border border-marketplace-border bg-marketplace-surface-subtle p-3 sm:gap-4 sm:p-4"
    >
      {showLogo ? (
        <StarSellerAvatar
          seller={seller}
          href={shopHref}
          sizeClassName="size-11 sm:size-12"
          imageSizes="48px"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-marketplace-muted-foreground">
          {t("soldBy")}
        </p>
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href={shopHref}
            className="truncate font-medium text-marketplace-foreground transition-colors hover:text-marketplace-brand hover:underline"
          >
            {seller.name}
          </Link>
        </div>
        {hasReviews ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-marketplace-muted-foreground">
            <StarRatingDisplay rating={seller.average_rating!} size="sm" />
            <span>({seller.reviews_count.toLocaleString()})</span>
          </div>
        ) : null}
      </div>
      {showVisitShop ? (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="hidden shrink-0 rounded-full sm:inline-flex"
        >
          <Link href={shopHref}>{th("visitShop")}</Link>
        </Button>
      ) : null}
    </div>
  );
}
