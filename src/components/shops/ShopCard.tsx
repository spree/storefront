import type { Seller } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StarRatingDisplay } from "@/components/reviews/StarRating";
import { FollowShopButton } from "@/components/shops/FollowShopButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShopCardSeller = Seller & {
  tagline?: string | null;
  sales_count?: number | null;
};

export type ShopCardVariant = "compact" | "rich";

interface ShopCardProps {
  seller: ShopCardSeller;
  basePath: string;
  locale: string;
  variant?: ShopCardVariant;
  showFollow?: boolean;
  className?: string;
}

export async function ShopCard({
  seller,
  basePath,
  locale,
  variant = "rich",
  showFollow = true,
  className,
}: ShopCardProps) {
  const tHome = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });
  const logo = seller.square_logo_url || seller.logo_url;
  const cover = seller.cover_photo_url;
  const shopHref = `${basePath}/sellers/${seller.slug}`;
  const hasReviews =
    seller.average_rating != null && (seller.reviews_count ?? 0) > 0;
  const tagline = seller.tagline?.trim();

  if (variant === "compact") {
    return (
      <article
        className={cn(
          "relative flex items-start gap-3 rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface p-3 shadow-[var(--marketplace-shadow-card)]",
          className,
        )}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="size-11 shrink-0 rounded-full border border-marketplace-border-subtle object-cover"
          />
        ) : (
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-marketplace-border-subtle bg-marketplace-surface-subtle text-sm font-semibold text-marketplace-foreground"
            aria-hidden
          >
            {seller.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-marketplace-foreground">
            <Link
              href={shopHref}
              className="hover:text-marketplace-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand"
            >
              {seller.name}
            </Link>
          </h3>
          {hasReviews ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-marketplace-muted-foreground">
              <StarRatingDisplay
                rating={seller.average_rating!}
                size="sm"
                showValue
              />
            </div>
          ) : null}
          {tagline ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-marketplace-muted-foreground">
              {tagline}
            </p>
          ) : null}
          <div className="relative z-10 mt-2 flex items-center gap-2">
            <Link
              href={shopHref}
              className="text-sm font-medium text-marketplace-foreground underline-offset-4 hover:underline"
            >
              {tHome("visitShop")}
            </Link>
            {showFollow ? (
              <FollowShopButton sellerId={seller.id} returnTo={shopHref} />
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[var(--marketplace-radius-md)] border border-marketplace-border-subtle bg-marketplace-surface shadow-[var(--marketplace-shadow-card)] transition-shadow duration-200 hover:shadow-[var(--marketplace-shadow-card-hover)]",
        className,
      )}
    >
      {cover ? (
        <div className="relative aspect-[5/2] w-full overflow-hidden bg-marketplace-surface-warm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {showFollow ? (
            <div className="absolute right-2 top-2 z-20">
              <FollowShopButton
                sellerId={seller.id}
                returnTo={shopHref}
                iconOnly
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="size-12 shrink-0 rounded-[var(--marketplace-radius-sm)] border border-marketplace-border-subtle object-cover"
            />
          ) : (
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-[var(--marketplace-radius-sm)] border border-marketplace-border-subtle bg-marketplace-surface-subtle font-semibold text-marketplace-foreground"
              aria-hidden
            >
              {seller.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="min-h-10 text-sm font-semibold leading-5 text-marketplace-foreground">
              <Link
                href={shopHref}
                className="line-clamp-2 hover:text-marketplace-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand"
              >
                {seller.name}
              </Link>
            </h3>
            {hasReviews ? (
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-marketplace-muted-foreground">
                <StarRatingDisplay
                  rating={seller.average_rating!}
                  size="xs"
                  showValue
                  plainValue
                  fractional
                />
                <span className="shrink-0">({seller.reviews_count})</span>
              </div>
            ) : null}
          </div>
        </div>
        {tagline ? (
          <p className="line-clamp-2 text-sm text-marketplace-muted-foreground">
            {tagline}
          </p>
        ) : null}
        <div className="relative z-10 mt-auto">
          <Link
            href={shopHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full border-marketplace-border",
            )}
          >
            {tHome("visitShop")}
          </Link>
        </div>
      </div>
    </article>
  );
}
