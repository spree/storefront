"use client";

import type { ProductFiltersResponse, StoreProduct } from "@spree/sdk";
import type { RefObject } from "react";
import {
  CloseIcon,
  FilterIcon,
  SearchIcon,
  SpinnerIcon,
} from "@/components/icons";
import {
  type ActiveFilters,
  ProductFilters,
} from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";

interface ProductListingLayoutProps {
  products: StoreProduct[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  basePath: string;
  filtersData: ProductFiltersResponse | null;
  filtersLoading: boolean;
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
  onFilterChange: (filters: ActiveFilters) => void;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  taxonId?: string;
  emptyMessage?: string;
  listId?: string;
  listName?: string;
}

export function ProductListingLayout({
  products,
  loading,
  loadingMore,
  hasMore,
  totalCount,
  basePath,
  filtersData,
  filtersLoading,
  showMobileFilters,
  setShowMobileFilters,
  onFilterChange,
  loadMoreRef,
  taxonId,
  emptyMessage = "Try adjusting your filters",
  listId,
  listName,
}: ProductListingLayoutProps) {
  return (
    <div className="lg:grid lg:grid-cols-4 lg:gap-8">
      {/* Mobile filter button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileFilters(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FilterIcon className="w-5 h-5" />
          Filters
        </button>
      </div>

      {/* Mobile filter drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/25"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-500"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <ProductFilters
                taxonId={taxonId}
                filtersData={filtersData}
                loading={filtersLoading}
                onFilterChange={onFilterChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar filters */}
      <div className="hidden lg:block">
        <div className="sticky top-20">
          <ProductFilters
            taxonId={taxonId}
            filtersData={filtersData}
            loading={filtersLoading}
            onFilterChange={onFilterChange}
          />
        </div>
      </div>

      {/* Products */}
      <div className="lg:col-span-3">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <SearchIcon
              className="mx-auto h-12 w-12 text-gray-400"
              strokeWidth={1.5}
            />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No products found
            </h3>
            <p className="mt-2 text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                Showing {products.length} of {totalCount} products
              </p>
            </div>

            <ProductGrid
              products={products}
              basePath={basePath}
              listId={listId}
              listName={listName}
            />

            {/* Load more trigger */}
            <div
              ref={loadMoreRef}
              className="h-20 flex items-center justify-center mt-8"
            >
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-500">
                  <SpinnerIcon className="animate-spin h-5 w-5" />
                  Loading more...
                </div>
              )}
              {!hasMore && products.length > 0 && (
                <p className="text-gray-500 text-sm">
                  No more products to load
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
