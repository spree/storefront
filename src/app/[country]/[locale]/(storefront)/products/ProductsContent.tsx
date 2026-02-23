"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { ProductListingLayout } from "@/components/products/ProductListingLayout";
import { useStore } from "@/contexts/StoreContext";
import { useProductListing } from "@/hooks/useProductListing";
import { trackViewItemList, trackViewSearchResults } from "@/lib/analytics/gtm";
import { getProducts } from "@/lib/data/products";

interface ProductsContentProps {
  basePath: string;
}

export function ProductsContent({ basePath }: ProductsContentProps) {
  const searchParams = useSearchParams();
  const { currency } = useStore();
  const query = searchParams.get("q") || "";

  const fetchFn = useCallback(
    (
      params: Record<string, unknown>,
      options: { currency: string; locale: string },
    ) => getProducts(params, options),
    [],
  );

  const listing = useProductListing({
    fetchFn,
    searchQuery: query,
  });

  const listId = query ? "search-results" : "all-products";
  const listName = query ? "Search Results" : "All Products";

  // Track view_item_list / view_search_results when products load
  useEffect(() => {
    if (listing.loading || listing.totalCount === 0) return;

    if (query) {
      trackViewSearchResults(listing.products, query, currency);
    } else {
      trackViewItemList(listing.products, listId, listName, currency);
    }
  }, [
    listing.products,
    listing.loading,
    listing.totalCount,
    query,
    listId,
    listName,
    currency,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        {query ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900">
              Search results for &ldquo;{query}&rdquo;
            </h1>
            <p className="mt-2 text-gray-500">
              {listing.totalCount}{" "}
              {listing.totalCount === 1 ? "product" : "products"} found
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
            <p className="mt-2 text-gray-500">Browse our complete collection</p>
          </>
        )}
      </div>

      <ProductListingLayout
        {...listing}
        basePath={basePath}
        onFilterChange={listing.handleFilterChange}
        listId={listId}
        listName={listName}
        emptyMessage={
          query
            ? `We couldn't find any products matching "${query}"`
            : "Try adjusting your filters"
        }
      />
    </div>
  );
}
