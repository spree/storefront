import type { Product, Seller } from "@spree/sdk";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import { MarketplacePage, MarketplaceSection } from "@/components/marketplace";
import { FeaturedShopFavoriteButton } from "@/components/shops/FeaturedShopFavoriteButton";
import {
  type ShopEditorialImage,
  ShopEditorialMedia,
} from "@/components/shops/ShopEditorialMedia";
import { StarSellerAvatar } from "@/components/shops/StarSellerAvatar";
import { CollectionTileCarousel } from "@/components/theme/CollectionTileCarousel";
import { buttonVariants } from "@/components/ui/button";
import { getSellerProducts } from "@/lib/data/sellers";
import { productDetailPathSegment } from "@/lib/discovery-context";
import { cn } from "@/lib/utils";

interface FeaturedShopsShowcaseProps {
  sellers: Seller[];
  basePath: string;
  locale: string;
  countryLabel?: string;
  title?: string;
  ctaHref?: string;
  ctaLabel?: string;
  carousel?: Omit<ComponentProps<typeof CollectionTileCarousel>, "items">;
}

function ShopEditorialCard({
  seller,
  basePath,
  locale,
  featuredProduct,
}: {
  seller: Seller;
  basePath: string;
  locale: string;
  featuredProduct?: Product;
}) {
  const shopHref = `${basePath}/sellers/${seller.slug}`;
  const rating = seller.average_rating;
  const price = featuredProduct?.price;
  const amount = price?.amount ? Number(price.amount) : NaN;
  const priceLabel =
    price?.currency && Number.isFinite(amount)
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: price.currency,
        }).format(amount)
      : price?.display_amount;
  const hasReviews = rating != null && (seller.reviews_count ?? 0) > 0;
  const images: ShopEditorialImage[] = [];
  if (featuredProduct?.thumbnail_url) {
    images.push({
      src: featuredProduct.thumbnail_url,
      kind: "product",
      href: `${basePath}/products/${productDetailPathSegment(featuredProduct)}`,
      label: featuredProduct.name,
      price: priceLabel || undefined,
    });
  }
  for (const [src, kind] of [
    [seller.cover_photo_url, "cover"],
    [seller.square_logo_url, "logo"],
    [seller.logo_url, "logo"],
  ] as const) {
    if (src && !images.some((image) => image.src === src)) {
      images.push({ src, kind, href: shopHref, label: seller.name });
    }
  }

  return (
    <article
      data-shop-editorial-card
      className="group relative h-full w-full min-w-0 snap-start overflow-hidden rounded-[var(--marketplace-radius-lg)] border border-marketplace-border-subtle bg-marketplace-surface shadow-[var(--marketplace-shadow-card)] transition-shadow motion-reduce:transition-none hover:shadow-[var(--marketplace-shadow-card-hover)]"
    >
      <ShopEditorialMedia
        key={JSON.stringify(images)}
        images={images}
        name={seller.name}
        shopHref={shopHref}
      />
      <FeaturedShopFavoriteButton sellerId={seller.id} shopPath={shopHref} />

      <div className="relative min-h-24 px-4 py-3.5 pe-[5.4rem]">
        <div className="absolute -top-5 end-3">
          <StarSellerAvatar
            seller={seller}
            sizeClassName="size-[4.35rem] rounded-full border-4 border-marketplace-surface bg-marketplace-surface shadow-sm"
            imageSizes="70px"
          />
        </div>
        <Link
          href={shopHref}
          className="block truncate font-display text-xl leading-tight text-marketplace-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand"
        >
          {seller.name}
        </Link>
        {seller.tagline ? (
          <p className="mt-1 line-clamp-1 text-xs leading-4 text-marketplace-muted-foreground">
            {seller.tagline}
          </p>
        ) : null}
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4 text-marketplace-muted-foreground">
          {hasReviews ? (
            <span className="inline-flex items-center gap-1 font-medium text-marketplace-foreground">
              <Star
                aria-hidden
                className="size-3.5 fill-[#d49132] text-[#d49132]"
              />
              {rating!.toFixed(1)}
              <span className="font-normal text-marketplace-muted-foreground">
                (
                {new Intl.NumberFormat(locale, { notation: "compact" }).format(
                  seller.reviews_count ?? 0,
                )}
                )
              </span>
            </span>
          ) : null}
          {seller.ships_from ? (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{seller.ships_from}</span>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export async function FeaturedShopsShowcase({
  sellers,
  basePath,
  locale,
  countryLabel,
  title,
  ctaHref = `${basePath}/shops`,
  ctaLabel,
  carousel,
}: FeaturedShopsShowcaseProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });
  const displaySellers = carousel ? sellers : sellers.slice(0, 3);
  if (displaySellers.length === 0) return null;
  const productResults = await Promise.all(
    displaySellers.map(async (seller) => {
      try {
        const response = await getSellerProducts(seller.slug, {
          sellerId: seller.id,
          limit: 8,
          projection: "shop-card",
        });
        return response.data?.find(
          (product) => product.purchasable && product.thumbnail_url,
        );
      } catch {
        return undefined;
      }
    }),
  );

  const heading =
    title ??
    (countryLabel
      ? t("exploreShopsInCountry", { country: countryLabel })
      : t("exploreShops"));

  const cards = displaySellers.map((seller, index) => (
    <ShopEditorialCard
      key={seller.id}
      seller={seller}
      basePath={basePath}
      locale={locale}
      featuredProduct={productResults[index]}
    />
  ));
  const content = (
    <div
      className="grid min-w-0 gap-6 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,3fr)] lg:items-end lg:gap-8"
      data-theme-section="featured_shops"
    >
      <header className="flex min-w-0 flex-col items-start lg:pb-2">
        <h2
          data-theme-section-heading
          className="max-w-[16ch] text-balance font-display text-[length:var(--marketplace-heading-size)] font-medium leading-[1.08] tracking-tight text-marketplace-foreground"
        >
          {heading}
        </h2>
        <Link
          href={ctaHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "default" }),
            "mt-4 min-h-11 rounded-full border-marketplace-brand bg-transparent px-5 text-sm font-semibold text-marketplace-foreground hover:bg-marketplace-accent",
          )}
        >
          {ctaLabel ?? t("viewTopFinds")}
          <ArrowUpRight aria-hidden className="ml-1 size-4" />
        </Link>
      </header>

      {carousel ? (
        <CollectionTileCarousel {...carousel} items={cards} />
      ) : (
        <section
          className="grid min-w-0 snap-x snap-mandatory grid-flow-col auto-cols-[minmax(14rem,76%)] gap-3 overflow-x-auto overscroll-x-contain pb-3 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:gap-4 sm:overflow-visible"
          aria-label={t("featuredShops")}
        >
          {cards}
        </section>
      )}
    </div>
  );

  return carousel ? (
    content
  ) : (
    <MarketplaceSection surface="warm">
      <MarketplacePage>{content}</MarketplacePage>
    </MarketplaceSection>
  );
}
