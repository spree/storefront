import type { Seller } from "@spree/sdk";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketplacePage, MarketplaceSection } from "@/components/marketplace";
import { StarSellerAvatar } from "@/components/shops/StarSellerAvatar";
import { buttonVariants } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { cn } from "@/lib/utils";

interface FeaturedShopsShowcaseProps {
  sellers: Seller[];
  basePath: string;
  locale: string;
  countryLabel?: string;
  title?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

function MakerCard({
  seller,
  basePath,
  locale,
}: {
  seller: Seller;
  basePath: string;
  locale: string;
}) {
  const shopHref = `${basePath}/sellers/${seller.slug}`;
  const rating = seller.average_rating;
  const hasReviews = rating != null && (seller.reviews_count ?? 0) > 0;

  return (
    <article className="group relative min-w-0 snap-start overflow-hidden rounded-2xl border border-[#e7e0da] bg-white shadow-[0_8px_24px_rgba(43,35,48,0.08)] transition-shadow duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none hover:shadow-[0_12px_28px_rgba(43,35,48,0.12)]">
      <Link
        href={shopHref}
        aria-label={seller.name}
        className="relative block aspect-[0.82] overflow-hidden bg-[#eee9e3] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#3c2d42]"
      >
        <ProductImage
          src={
            seller.cover_photo_url || seller.square_logo_url || seller.logo_url
          }
          alt=""
          fill
          sizes="(min-width: 1024px) 23vw, (min-width: 640px) 30vw, 78vw"
          className={`transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none group-hover:scale-[1.02] group-focus-within:scale-[1.02] ${seller.cover_photo_url ? "object-cover" : "object-contain p-12"}`}
          iconClassName="size-11 text-[#8d7b8b]"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/15 to-transparent" />
      </Link>

      <div className="relative min-h-[6.4rem] px-4 pb-3 pt-3.5 pr-[5.4rem]">
        <StarSellerAvatar
          seller={seller}
          href={shopHref}
          sizeClassName="absolute -top-9 right-3 size-[4.35rem] rounded-full border-[4px] border-white bg-white shadow-sm"
          imageSizes="70px"
        />
        <Link
          href={shopHref}
          className="block truncate font-display text-xl leading-tight text-[#302434] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3c2d42]"
        >
          {seller.name}
        </Link>
        {seller.tagline?.trim() ? (
          <p className="mt-1 line-clamp-1 text-xs leading-4 text-[#6b626b]">
            {seller.tagline.trim()}
          </p>
        ) : null}
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-[#625b63]">
          {hasReviews ? (
            <span className="inline-flex items-center gap-1 font-medium text-[#39313d]">
              <Star
                aria-hidden
                className="size-3.5 fill-[#d49132] text-[#d49132]"
              />
              {rating!.toFixed(1)}
              <span className="font-normal text-[#756d75]">
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
              <MapPin aria-hidden className="size-3 shrink-0 text-[#97754d]" />
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
}: FeaturedShopsShowcaseProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });
  const displaySellers = sellers.slice(0, 3);
  if (displaySellers.length === 0) return null;

  const heading =
    title ??
    (countryLabel
      ? t("exploreShopsInCountry", { country: countryLabel })
      : t("exploreShops"));

  return (
    <MarketplaceSection
      surface="warm"
      className="overflow-hidden bg-marketplace-canvas"
      data-theme-section="featured_shops"
    >
      <MarketplacePage>
        <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(13rem,0.82fr)_minmax(0,2.8fr)] lg:items-end lg:gap-8 xl:gap-10">
          <header className="flex min-w-0 flex-col items-start lg:pb-3">
            <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#987243]">
              <span aria-hidden="true" className="h-px w-7 bg-[#c58b4e]" />
              {t("featuredShops")}
            </p>
            <h2 className="max-w-[17ch] font-display text-4xl font-medium leading-[0.98] tracking-[-0.035em] text-[#302434] sm:text-5xl lg:text-[clamp(2.6rem,3.4vw,4.3rem)]">
              {heading}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#6d646c]">
              {t("shopsYoullLoveDescription")}
            </p>
            <Link
              href={ctaHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "mt-5 min-h-11 rounded-full border-[#3c2d42] bg-transparent px-5 text-sm font-semibold text-[#3c2d42] hover:bg-[#3c2d42] hover:text-white",
              )}
            >
              {ctaLabel ?? t("viewTopFinds")}
              <ArrowUpRight aria-hidden className="ml-1 size-4" />
            </Link>
          </header>

          <section
            className="-mx-4 grid min-w-0 snap-x snap-mandatory grid-flow-col auto-cols-[minmax(15rem,78vw)] gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-3"
            aria-label={t("featuredShops")}
          >
            {displaySellers.map((seller) => (
              <MakerCard
                key={seller.id}
                seller={seller}
                basePath={basePath}
                locale={locale}
              />
            ))}
          </section>
        </div>
      </MarketplacePage>
    </MarketplaceSection>
  );
}
