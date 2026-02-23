"use client";

import { useCallback, useEffect } from "react";
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
    (
      params: Record<string, unknown>,
      options: { currency: string; locale: string },
    ) => getTaxonProducts(taxonPermalink, params, options),
    [taxonPermalink],
  );

  const listing = useProductListing({
    fetchFn,
    filterParams: { taxon_id: taxonId },
  });

  const listId = `category-${taxonId}`;
  const listName = `Category: ${taxonName}`;

  // Track view_item_list when products load
  useEffect(() => {
    if (listing.loading || listing.totalCount === 0) return;
    trackViewItemList(listing.products, listId, listName, currency);
  }, [
    listing.products,
    listing.loading,
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
