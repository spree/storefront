import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  MarketplacePage,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";
import { ProductListing } from "@/components/products/ProductListing";
import { resolveCurrency } from "@/lib/data/markets";
import { getProductFilters, getProducts } from "@/lib/data/products";
import { generateProductsMetadata } from "@/lib/metadata/products";
import { parseListingSearchParams } from "@/lib/utils/listing-search-params";

interface ProductsPageProps {
  params: Promise<{
    country: string;
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: ProductsPageProps): Promise<Metadata> {
  const { country, locale } = await params;
  return generateProductsMetadata({ country, locale });
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const { country, locale } = await params;
  const rawSearchParams = await searchParams;
  const basePath = `/${country}/${locale}`;
  const currency = await resolveCurrency(country);

  const listingState = parseListingSearchParams(rawSearchParams);
  const query = listingState.query;

  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "products",
  });

  const listId = query ? "search-results" : "all-products";
  const listName = query ? "Search Results" : "All Products";

  return (
    <MarketplaceSection
      className="pb-10 pt-6 md:pt-8"
      data-theme-discovery-listing
    >
      <MarketplacePage>
        <header className="mb-6 border-b border-marketplace-border-subtle pb-6 md:mb-8 md:pb-8">
          {query ? (
            <MarketplaceSectionHeader
              density="listing"
              headingLevel="h1"
              title={t("searchResultsFor", { query })}
            />
          ) : (
            <MarketplaceSectionHeader
              density="listing"
              headingLevel="h1"
              title={t("allProducts")}
              description={t("browseCollection")}
            />
          )}
        </header>

        <ProductListing
          state={listingState}
          basePath={basePath}
          currency={currency}
          locale={locale as Locale}
          listId={listId}
          listName={listName}
          fetchProducts={getProducts}
          fetchFilters={getProductFilters}
          emptyMessage={
            query
              ? t("noMatchingProducts", { query })
              : t("tryAdjustingFilters")
          }
        />
      </MarketplacePage>
    </MarketplaceSection>
  );
}
