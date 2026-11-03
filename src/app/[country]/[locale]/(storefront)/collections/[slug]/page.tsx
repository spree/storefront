import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductListing } from "@/components/products/ProductListing";
import { getCollection, getCollectionProducts } from "@/lib/data/collections";
import { resolveCurrency } from "@/lib/data/markets";
import { getProductFilters } from "@/lib/data/products";
import { parseListingSearchParams } from "@/lib/utils/listing-search-params";

interface CollectionPageProps {
  params: Promise<{ country: string; locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const collection = await getCollection(slug);
    const title = collection.meta_title || collection.name;
    const description =
      collection.meta_description ||
      collection.description ||
      `Browse ${collection.name}.`;

    return {
      title,
      description,
      ...(collection.meta_keywords
        ? { keywords: collection.meta_keywords }
        : {}),
      openGraph: {
        title,
        description,
        type: "website",
        ...(collection.image_url
          ? { images: [{ url: collection.image_url, alt: collection.name }] }
          : {}),
      },
    };
  } catch {
    return { title: "Collection Not Found" };
  }
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { country, locale, slug } = await params;
  const rawSearchParams = await searchParams;
  const basePath = `/${country}/${locale}`;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "collections",
  });

  let collection;
  try {
    collection = await getCollection(slug);
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    notFound();
  }

  if (!collection) notFound();

  const currency = await resolveCurrency(country);
  const listingState = parseListingSearchParams(rawSearchParams);
  const fetchCollectionProducts = getCollectionProducts.bind(
    null,
    collection.permalink,
  );

  return (
    <div>
      <header
        className="flex min-h-70 flex-col justify-end bg-gray-50 bg-cover bg-center py-8"
        style={
          collection.image_url
            ? { backgroundImage: `url(${collection.image_url})` }
            : undefined
        }
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-3 max-w-2xl text-gray-700">
              {collection.description}
            </p>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 pt-4 sm:px-6 lg:px-8">
        <ProductListing
          state={listingState}
          basePath={basePath}
          currency={currency}
          locale={locale as Locale}
          listId={`collection-${collection.id}`}
          listName={`Collection: ${collection.name}`}
          fetchProducts={fetchCollectionProducts}
          fetchFilters={getProductFilters}
          emptyMessage={t("noProducts")}
        />
      </div>
    </div>
  );
}
