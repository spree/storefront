"use client";

import type {
  PaginatedResponse,
  ProductFiltersResponse,
  ProductListParams,
  StoreProduct,
} from "@spree/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveFilters } from "@/components/products/ProductFilters";
import { getProductFilters } from "@/lib/data/products";
import { buildProductQueryParams } from "@/lib/utils/product-query";

/** Shallow compare two ActiveFilters objects. */
function filtersEqual(a: ActiveFilters, b: ActiveFilters): boolean {
  if (a.priceMin !== b.priceMin || a.priceMax !== b.priceMax) return false;
  if (a.availability !== b.availability) return false;
  if (a.sortBy !== b.sortBy) return false;
  if (a.optionValues.length !== b.optionValues.length) return false;
  const aVals = [...a.optionValues].sort();
  const bVals = [...b.optionValues].sort();
  for (let i = 0; i < aVals.length; i++) {
    if (aVals[i] !== bVals[i]) return false;
  }
  return true;
}

interface UseProductListingOptions {
  /** Function that fetches a page of products given query params. */
  fetchFn: (
    params: ProductListParams,
  ) => Promise<PaginatedResponse<StoreProduct>>;
  /** Optional params passed to getProductFilters (e.g. { taxon_id }). */
  filterParams?: ProductListParams;
  /** Optional search query string. */
  searchQuery?: string;
}

export function useProductListing({
  fetchFn,
  filterParams = {},
  searchQuery = "",
}: UseProductListingOptions) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    optionValues: [],
  });
  const [filtersData, setFiltersData] = useState<ProductFiltersResponse | null>(
    null,
  );
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const filtersRef = useRef<ActiveFilters>({ optionValues: [] });
  const filterParamsRef = useRef(filterParams);
  filterParamsRef.current = filterParams;
  const filterParamsKey = useMemo(
    () => JSON.stringify(filterParams),
    [filterParams],
  );
  const loadIdRef = useRef(0);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const fetchProducts = useCallback(
    async (page: number, filters: ActiveFilters, query: string) => {
      try {
        const queryParams = buildProductQueryParams(filters, query);
        return await fetchFn({ page, limit: 12, ...queryParams });
      } catch (error) {
        console.error("Failed to fetch products:", error);
        return null;
      }
    },
    [fetchFn],
  );

  const loadProducts = useCallback(
    async (filters: ActiveFilters, query: string) => {
      setLoading(true);
      pageRef.current = 1;
      const currentLoadId = ++loadIdRef.current;

      const response = await fetchProducts(1, filters, query);

      if (response && loadIdRef.current === currentLoadId) {
        setProducts(response.data);
        setTotalCount(response.meta.count);
        const moreAvailable = 1 < response.meta.pages;
        setHasMore(moreAvailable);
        hasMoreRef.current = moreAvailable;
      }

      if (loadIdRef.current === currentLoadId) {
        setLoading(false);
      }
    },
    [fetchProducts],
  );

  // Fetch filters (scoped to search query when present)
  useEffect(() => {
    // Track filterParams changes for re-fetching on soft-nav
    void filterParamsKey;

    let cancelled = false;

    const fetchFilters = async () => {
      setFiltersLoading(true);
      try {
        const params = { ...filterParamsRef.current };
        if (searchQuery) {
          params.multi_search = searchQuery;
        }
        const response = await getProductFilters(params);
        if (!cancelled) {
          setFiltersData(response);
        }
      } catch (error) {
        console.error("Failed to fetch filters:", error);
      } finally {
        if (!cancelled) {
          setFiltersLoading(false);
        }
      }
    };

    fetchFilters();

    return () => {
      cancelled = true;
    };
  }, [searchQuery, filterParamsKey]);

  // Load products when search query or filter params change
  useEffect(() => {
    // Track filterParams changes for re-fetching on soft-nav
    void filterParamsKey;
    loadProducts(filtersRef.current, searchQuery);
  }, [searchQuery, loadProducts, filterParamsKey]);

  const handleFilterChange = useCallback(
    (newFilters: ActiveFilters) => {
      if (!filtersEqual(filtersRef.current, newFilters)) {
        filtersRef.current = newFilters;
        setActiveFilters(newFilters);
        loadProducts(newFilters, searchQueryRef.current);
      }
    },
    [loadProducts],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current) return;

    setLoadingMore(true);
    const currentLoadId = loadIdRef.current;
    const nextPage = pageRef.current + 1;

    const response = await fetchProducts(nextPage, activeFilters, searchQuery);

    if (response && loadIdRef.current === currentLoadId) {
      setProducts((prev) => [...prev, ...response.data]);
      const moreAvailable = nextPage < response.meta.pages;
      setHasMore(moreAvailable);
      hasMoreRef.current = moreAvailable;
      pageRef.current = nextPage;
    }

    setLoadingMore(false);
  }, [fetchProducts, loadingMore, activeFilters, searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [loadMore, loading, loadingMore]);

  return {
    products,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    filtersData,
    filtersLoading,
    showMobileFilters,
    setShowMobileFilters,
    handleFilterChange,
    loadMoreRef,
  };
}
