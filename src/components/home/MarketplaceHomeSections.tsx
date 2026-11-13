import type { StoreMerchandisingPlacement } from "@spree/sdk";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CategoryBrowseGrid } from "@/components/home/CategoryBrowseGrid";
import { FeaturedShopsShowcase } from "@/components/home/FeaturedShopsShowcase";
import { HomeCuratedProductRail } from "@/components/home/HomeCuratedProductRail";
import { HomeEditorialBanners } from "@/components/home/HomeEditorialBanners";
import { HomeServiceTrustBar } from "@/components/home/HomeServiceTrustBar";
import { HomeTrustSection } from "@/components/home/HomeTrustSection";
import {
  MerchandisingCollectionTiles,
  MerchandisingProductRails,
  MerchandisingShopRails,
} from "@/components/home/MerchandisingRails";
import { PersonalizedHomeRails } from "@/components/home/PersonalizedHomeRails";
import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductRecommendationRail } from "@/components/products/ProductRecommendationRail";
import { PRODUCT_CARD_FIELDS } from "@/lib/data/cached";
import { getCategories } from "@/lib/data/categories";
import { cachedListProducts } from "@/lib/data/products";
import {
  getFollowedShopProducts,
  getNewArrivalProducts,
  getTrendingProducts,
} from "@/lib/data/recommendations";
import { getAccessToken, getClient } from "@/lib/spree";

function RailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function ProductRail({
  basePath,
  locale,
  country,
  currency,
  titleKey,
  sort,
}: {
  basePath: string;
  locale: string;
  country: string;
  currency?: string;
  titleKey: "customerFavorites" | "deals";
  sort: string;
}) {
  const t = await getTranslations("home");
  const userToken = await getAccessToken();
  const productsResponse = await cachedListProducts(
    { limit: 8, fields: PRODUCT_CARD_FIELDS, sort },
    { locale, country },
    "dtc",
    userToken,
  );

  if (!productsResponse.data?.length) return null;

  const listId = `home-${titleKey}`;

  return (
    <ProductRecommendationRail
      title={t(titleKey)}
      products={productsResponse.data}
      basePath={basePath}
      currency={currency}
      listId={listId}
      listName={t(titleKey)}
      moreHref={`${basePath}/products`}
      variant="etsy"
    />
  );
}

async function TrendingRail({
  basePath,
  locale,
  currency,
}: {
  basePath: string;
  locale: string;
  currency?: string;
}) {
  const t = await getTranslations("home");
  const products = await getTrendingProducts();
  return (
    <ProductRecommendationRail
      title={t("trendingNow")}
      products={products}
      basePath={basePath}
      currency={currency}
      listId="recommendation-trending"
      listName="Trending"
      moreHref={`${basePath}/products`}
      variant="etsy"
    />
  );
}

async function NewArrivalsRail({
  basePath,
  locale,
  currency,
}: {
  basePath: string;
  locale: string;
  currency?: string;
}) {
  const t = await getTranslations("home");
  const products = await getNewArrivalProducts();
  return (
    <ProductRecommendationRail
      title={t("newAndNoteworthy")}
      products={products}
      basePath={basePath}
      currency={currency}
      listId="recommendation-new"
      listName="New arrivals"
      moreHref={`${basePath}/products`}
      variant="etsy"
    />
  );
}

async function FollowedShopsRail({
  basePath,
  locale,
  currency,
}: {
  basePath: string;
  locale: string;
  currency?: string;
}) {
  const t = await getTranslations("home");
  const products = await getFollowedShopProducts();
  return (
    <ProductRecommendationRail
      title={t("newFromFollowedShops")}
      products={products}
      basePath={basePath}
      currency={currency}
      listId="recommendation-followed-shops"
      listName="From shops you follow"
      moreHref={`${basePath}/products`}
    />
  );
}

async function FeaturedShopsShowcaseRail({
  basePath,
  locale,
}: {
  basePath: string;
  locale: string;
}) {
  let sellers;
  try {
    sellers = await getClient().sellers.list({
      limit: 6,
      sort: "-average_rating",
    });
  } catch {
    return null;
  }

  if (!sellers.data?.length) return null;

  return (
    <FeaturedShopsShowcase
      sellers={sellers.data}
      basePath={basePath}
      locale={locale}
    />
  );
}

async function HomeCategoryDiscovery({
  basePath,
  locale,
  country,
}: {
  basePath: string;
  locale: string;
  country: string;
}) {
  const categoriesResponse = await getCategories(
    { limit: 12, depth_eq: 0 },
    { locale, country },
  );
  const categories = categoriesResponse.data ?? [];
  if (!categories.length) return null;

  return (
    <CategoryBrowseGrid
      categories={categories}
      basePath={basePath}
      locale={locale}
    />
  );
}

interface MarketplaceHomeSectionsProps {
  basePath: string;
  locale: string;
  country: string;
  currency?: string;
  placements?: StoreMerchandisingPlacement[];
}

export async function MarketplaceHomeSections({
  basePath,
  locale,
  country,
  currency,
  placements = [],
}: MarketplaceHomeSectionsProps) {
  const hasProductRails = placements.some(
    (placement) =>
      placement.kind === "product_rail" && placement.products.length > 0,
  );
  const hasShopRails = placements.some(
    (placement) =>
      placement.kind === "shop_rail" && placement.sellers.length > 0,
  );

  return (
    <>
      <Suspense fallback={null}>
        <HomeCategoryDiscovery
          basePath={basePath}
          locale={locale}
          country={country}
        />
      </Suspense>
      {hasShopRails ? null : (
        <Suspense fallback={null}>
          <FeaturedShopsShowcaseRail basePath={basePath} locale={locale} />
        </Suspense>
      )}
      <MerchandisingProductRails
        placements={placements}
        basePath={basePath}
        currency={currency}
      />
      <MerchandisingShopRails
        placements={placements}
        basePath={basePath}
        locale={locale}
        country={country}
      />
      <MerchandisingCollectionTiles
        placements={placements}
        basePath={basePath}
      />
      {hasProductRails ? null : (
        <Suspense fallback={<RailSkeleton />}>
          <TrendingRail
            basePath={basePath}
            locale={locale}
            currency={currency}
          />
        </Suspense>
      )}
      <Suspense fallback={<RailSkeleton />}>
        <ProductRail
          basePath={basePath}
          locale={locale}
          country={country}
          currency={currency}
          titleKey="customerFavorites"
          sort="-reviews_count"
        />
      </Suspense>
      <Suspense fallback={<RailSkeleton />}>
        <HomeCuratedProductRail
          basePath={basePath}
          locale={locale}
          currency={currency}
        />
      </Suspense>
      {hasProductRails ? null : (
        <Suspense fallback={<RailSkeleton />}>
          <NewArrivalsRail
            basePath={basePath}
            locale={locale}
            currency={currency}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <FollowedShopsRail
          basePath={basePath}
          locale={locale}
          currency={currency}
        />
      </Suspense>
      <Suspense fallback={null}>
        <PersonalizedHomeRails basePath={basePath} currency={currency} />
      </Suspense>
      <Suspense fallback={<RailSkeleton />}>
        <ProductRail
          basePath={basePath}
          locale={locale}
          country={country}
          currency={currency}
          titleKey="deals"
          sort="price"
        />
      </Suspense>
      <HomeEditorialBanners basePath={basePath} locale={locale} />
      <HomeServiceTrustBar locale={locale} />
      <Suspense fallback={null}>
        <HomeTrustSection basePath={basePath} locale={locale} />
      </Suspense>
    </>
  );
}
