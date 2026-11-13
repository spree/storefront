import type { StoreMerchandisingPlacement } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FeaturedShopsShowcase } from "@/components/home/FeaturedShopsShowcase";
import { MerchandisingImpression } from "@/components/home/MerchandisingTracker";
import {
  MarketplaceEditorialTile,
  MarketplaceGrid,
  MarketplacePage,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";
import { ProductRecommendationRail } from "@/components/products/ProductRecommendationRail";
import { getCountry } from "@/lib/data/countries";
import { getCollectionStockImage } from "@/lib/marketplace-stock-images";

function destinationHref(basePath: string, value?: string | null) {
  if (!value) return `${basePath}/products`;
  if (value.startsWith("http")) return value;
  return `${basePath}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function MerchandisingProductRails({
  placements,
  basePath,
  currency,
}: {
  placements: StoreMerchandisingPlacement[];
  basePath: string;
  currency?: string;
}) {
  const rails = placements.filter(
    (placement) =>
      (placement.kind === "product_rail" ||
        placement.kind === "featured_products" ||
        placement.kind === "featured_collection") &&
      placement.products.length > 0,
  );

  return (
    <>
      {rails.map((placement) => (
        <div key={placement.id}>
          <MerchandisingImpression
            event="campaign_impression"
            payload={{
              campaign_id: placement.campaign_id,
              placement_id: placement.id,
              collection_id: placement.collection_id,
            }}
          />
          <ProductRecommendationRail
            title={
              placement.title ||
              placement.campaign_title ||
              placement.heading ||
              ""
            }
            products={placement.products}
            basePath={basePath}
            currency={currency}
            listId={`merchandising-${placement.id}`}
            listName={placement.title || placement.campaign_name}
            moreHref={destinationHref(basePath, placement.cta_url)}
            moreLabel={placement.cta_label || undefined}
          />
        </div>
      ))}
    </>
  );
}

export async function MerchandisingShopRails({
  placements,
  basePath,
  locale,
  country,
}: {
  placements: StoreMerchandisingPlacement[];
  basePath: string;
  locale: string;
  country: string;
}) {
  const rails = placements.filter(
    (placement) =>
      placement.kind === "shop_rail" && placement.sellers.length > 0,
  );
  if (rails.length === 0) return null;

  const t = await getTranslations("home");

  let countryLabel: string | undefined;
  try {
    const countryRecord = await getCountry(country);
    countryLabel = countryRecord.name;
  } catch {
    countryLabel = undefined;
  }

  return (
    <>
      {rails.map((placement) => (
        <div key={placement.id}>
          <MerchandisingImpression
            event="campaign_impression"
            payload={{
              campaign_id: placement.campaign_id,
              placement_id: placement.id,
            }}
          />
          <FeaturedShopsShowcase
            sellers={placement.sellers}
            basePath={basePath}
            locale={locale}
            countryLabel={countryLabel}
            title={placement.title || undefined}
            ctaHref={destinationHref(basePath, placement.cta_url)}
            ctaLabel={placement.cta_label || t("viewTopFinds")}
          />
        </div>
      ))}
    </>
  );
}

export async function MerchandisingCollectionTiles({
  placements,
  basePath,
}: {
  placements: StoreMerchandisingPlacement[];
  basePath: string;
}) {
  const t = await getTranslations("home");
  const tiles = placements.filter(
    (placement) =>
      placement.kind === "collection_tiles" && placement.collection,
  );
  if (!tiles.length) return null;

  return (
    <MarketplaceSection>
      <MarketplacePage>
        <MarketplaceSectionHeader title={t("giftGuides")} />
        <MarketplaceGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((placement) => {
            const collection = placement.collection;
            if (!collection) return null;
            return (
              <MarketplaceEditorialTile
                key={placement.id}
                href={`${basePath}/collections/${collection.permalink}`}
                title={collection.name}
                eyebrow={collection.cta_label || t("shopNow")}
                imageUrl={
                  collection.image_url ||
                  getCollectionStockImage(0, collection.name)
                }
                aspect="landscape"
              />
            );
          })}
        </MarketplaceGrid>
      </MarketplacePage>
    </MarketplaceSection>
  );
}
