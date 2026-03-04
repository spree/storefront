"use client";

import type { ProductListParams } from "@spree/sdk";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ProductListingLayout } from "@/components/products/ProductListingLayout";
import { useStore } from "@/contexts/StoreContext";
import { useProductListing } from "@/hooks/useProductListing";
import { trackViewItemList } from "@/lib/analytics/gtm";
import { getTaxonProducts } from "@/lib/data/products";

interface CategoryProductsContentProps {
  taxonPermalink: string;
  taxonId: string;
  taxonName: string;
  basePath: string;
}

export function CategoryProductsContent({
  taxonPermalink,
  taxonId,
  taxonName,
  basePath,
}: CategoryProductsContentProps) {
  const { currency } = useStore();

  const fetchFn = useCallback(
    (params: ProductListParams) => getTaxonProducts(taxonPermalink, params),
    [taxonPermalink],
  );

  const filterParams = useMemo(() => ({ taxon_id: taxonId }), [taxonId]);

  const listing = useProductListing({
    fetchFn,
    filterParams,
  });

  const listId = useMemo(() => `category-${taxonId}`, [taxonId]);
  const listName = useMemo(() => `Category: ${taxonName}`, [taxonName]);

  // Track view_item_list only on fresh loads (not loadMore).
  const prevLoadingRef = useRef(true);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = listing.loading;

    if (!wasLoading || listing.loading || listing.totalCount === 0) return;

    trackViewItemList(listing.products, listId, listName, currency);
  }, [
    listing.loading,
    listing.products,
    listing.totalCount,
    listId,
    listName,
    currency,
  ]);

  return (
    <ProductListingLayout
      {...listing}
      basePath={basePath}
      taxonId={taxonId}
      onFilterChange={listing.handleFilterChange}
      listId={listId}
      listName={listName}
      emptyMessage="No products found matching your filters."
    />
  );
}
