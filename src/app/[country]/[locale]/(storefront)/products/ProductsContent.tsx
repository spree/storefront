"use client";

import type { ProductListParams } from "@spree/sdk";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
    (params: ProductListParams) => getProducts(params),
    [],
  );

  const listing = useProductListing({
    fetchFn,
    searchQuery: query,
  });

  const listId = useMemo(
    () => (query ? "search-results" : "all-products"),
    [query],
  );
  const listName = useMemo(
    () => (query ? "Search Results" : "All Products"),
    [query],
  );

  // Track view_item_list / view_search_results only on fresh loads (not loadMore).
  // loading transitions true→false on initial/filter/search loads; loadMore uses loadingMore instead.
  const prevLoadingRef = useRef(true);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = listing.loading;

    if (!wasLoading || listing.loading || listing.totalCount === 0) return;

    if (query) {
      trackViewSearchResults(listing.products, query, currency);
    } else {
      trackViewItemList(listing.products, listId, listName, currency);
    }
  }, [
    listing.loading,
    listing.products,
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
