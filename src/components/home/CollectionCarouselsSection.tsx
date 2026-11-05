import type { Collection, Product } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FeaturedProductsSection } from "@/components/home/FeaturedProductsSection";
import { LazyProductCarousel } from "@/components/products/LazyProductCarousel";
import { Button } from "@/components/ui/button";
import { PRODUCT_CARD_FIELDS } from "@/lib/data/cached";
import {
  cachedListCollectionProducts,
  getCollections,
} from "@/lib/data/collections";
import { getAccessToken } from "@/lib/spree";

/** Collections promoted on the home page, in the merchant's order. */
const HOME_COLLECTION_LIMIT = 3;
/** Collections looked at to fill the shelves; leading ones may be empty. */
const HOME_COLLECTION_CANDIDATES = 12;
/** Spare shelves loaded in case a collection has nothing sold in this market. */
const HOME_COLLECTION_SPARES = 2;
const PRODUCTS_PER_CAROUSEL = 8;

interface CollectionCarouselsSectionProps {
  basePath: string;
  locale: string;
  country: string;
  currency?: string;
}

interface CollectionShelf {
  collection: Collection;
  products: Product[];
}

/**
 * The home page's product shelves: one carousel per collection. Falls back to
 * the generic Featured Products carousel when the store has no collection
 * with products to show, or collections fail to load.
 */
export async function CollectionCarouselsSection({
  basePath,
  locale,
  country,
  currency,
}: CollectionCarouselsSectionProps): Promise<React.JSX.Element> {
  const shelves = await loadShelves(locale, country);

  if (shelves.length === 0) {
    return (
      <FeaturedProductsSection
        basePath={basePath}
        locale={locale}
        country={country}
        currency={currency}
      />
    );
  }

  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "home",
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {shelves.map(({ collection, products }, index) => {
        const headingId = `home-collection-${collection.id}`;
        return (
          <section
            key={collection.id}
            aria-labelledby={headingId}
            className="featured-products"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 id={headingId} className="text-2xl font-bold text-gray-900">
                {collection.name}
              </h2>
              <Button variant="link" asChild>
                <Link href={`${basePath}/collections/${collection.permalink}`}>
                  {t("viewAll")} &rarr;
                </Link>
              </Button>
            </div>
            <LazyProductCarousel
              products={products}
              basePath={basePath}
              currency={currency}
              listId={`collection-${collection.id}`}
              listName={`Collection: ${collection.name}`}
              prioritizeFirst={index === 0}
            />
          </section>
        );
      })}
    </div>
  );
}

/** Promoted collections with their first products; empty ones are skipped. */
async function loadShelves(
  locale: string,
  country: string,
): Promise<CollectionShelf[]> {
  const options = { locale, country };
  try {
    const [{ data: collections }, userToken] = await Promise.all([
      getCollections(
        {
          limit: HOME_COLLECTION_CANDIDATES,
          sort: "position",
          fields: ["id", "name", "permalink", "products_count"],
        },
        options,
      ),
      getAccessToken(),
    ]);
    const shelves = await Promise.all(
      collections
        .filter((collection) => collection.products_count > 0)
        .slice(0, HOME_COLLECTION_LIMIT + HOME_COLLECTION_SPARES)
        .map(async (collection) => {
          const { data: products } = await cachedListCollectionProducts(
            collection.id,
            { limit: PRODUCTS_PER_CAROUSEL, fields: PRODUCT_CARD_FIELDS },
            options,
            userToken,
          );
          return { collection, products };
        }),
    );
    // A collection can count products that aren't sold in this market.
    return shelves
      .filter((shelf) => shelf.products.length > 0)
      .slice(0, HOME_COLLECTION_LIMIT);
  } catch (error) {
    console.error("Home: failed to load collection carousels", error);
    return [];
  }
}
