import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ProductListing } from "@/components/products/ProductListing";
import { ProductListingSkeleton } from "@/components/products/ProductListingSkeleton";
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

/**
 * The search query lives in the URL, which is only known per request, so the
 * page body streams behind a skeleton instead of blocking the navigation.
 */
export default function ProductsPage(props: ProductsPageProps) {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsPageContent {...props} />
    </Suspense>
  );
}

function ProductsPageSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="h-9 w-64 rounded bg-gray-200 animate-pulse motion-reduce:animate-none" />
      </div>
      <ProductListingSkeleton />
    </div>
  );
}

async function ProductsPageContent({
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        {query ? (
          <h1 className="text-3xl font-bold text-gray-900">
            {t("searchResultsFor", { query })}
          </h1>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("allProducts")}
            </h1>
            <p className="mt-2 text-gray-500">{t("browseCollection")}</p>
          </>
        )}
      </div>

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
          query ? t("noMatchingProducts", { query }) : t("tryAdjustingFilters")
        }
      />
    </div>
  );
}
