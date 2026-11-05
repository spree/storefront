import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CollectionHeader } from "@/components/collections/CollectionHeader";
import { ProductListing } from "@/components/products/ProductListing";
import {
  getCollection,
  getCollectionFilters,
  getCollectionProducts,
} from "@/lib/data/collections";
import { resolveCurrency } from "@/lib/data/markets";
import { generateCollectionMetadata } from "@/lib/metadata/collection";
import { parseListingSearchParams } from "@/lib/utils/listing-search-params";
import { queryString } from "@/lib/utils/query-string";

interface CollectionPageProps {
  params: Promise<{ country: string; locale: string; permalink: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { country, locale, permalink } = await params;
  return generateCollectionMetadata({ country, locale, permalink });
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps): Promise<React.JSX.Element> {
  const { country, locale, permalink } = await params;
  const [rawSearchParams, collection, currency, t] = await Promise.all([
    searchParams,
    getCollection(permalink, { country, locale }),
    resolveCurrency(country),
    getTranslations({ locale: locale as Locale, namespace: "collections" }),
  ]);

  // The 404 status comes from the proxy's existence check; this is the
  // fallback for a collection that disappears between that check and the
  // render.
  if (!collection) notFound();

  const basePath = `/${country}/${locale}`;

  // An old permalink still resolves after a rename; send it to the current one.
  if (collection.permalink !== decodeURIComponent(permalink)) {
    permanentRedirect(
      `${basePath}/collections/${collection.permalink}${queryString(rawSearchParams)}`,
    );
  }
  const listingState = parseListingSearchParams(rawSearchParams);

  // Pre-bind the collection ID so the client InfiniteProductList island gets
  // a single-arg fetcher; `.bind()` on a server action serializes across the
  // server→client boundary where an inline closure would not.
  const fetchCollectionProducts = getCollectionProducts.bind(
    null,
    collection.id,
  );
  const fetchCollectionFilters = getCollectionFilters.bind(null, collection.id);

  return (
    <div className="pb-8">
      <CollectionHeader
        collection={collection}
        basePath={basePath}
        locale={locale as Locale}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ProductListing
          state={listingState}
          basePath={basePath}
          currency={currency}
          locale={locale as Locale}
          listId={`collection-${collection.id}`}
          listName={`Collection: ${collection.name}`}
          fetchProducts={fetchCollectionProducts}
          fetchFilters={fetchCollectionFilters}
          emptyMessage={t("noProducts")}
        />
      </div>
    </div>
  );
}
