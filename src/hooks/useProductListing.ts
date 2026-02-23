"use client";

import type {
  PaginatedResponse,
  ProductFiltersResponse,
  StoreProduct,
} from "@spree/sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveFilters } from "@/components/products/ProductFilters";
import { useStore } from "@/contexts/StoreContext";
import { getProductFilters } from "@/lib/data/products";
import { buildProductQueryParams } from "@/lib/utils/product-query";

interface UseProductListingOptions {
  /** Function that fetches a page of products given query params and store options. */
  fetchFn: (
    params: Record<string, unknown>,
    options: { currency: string; locale: string },
  ) => Promise<PaginatedResponse<StoreProduct>>;
  /** Optional params passed to getProductFilters (e.g. { taxon_id }). */
  filterParams?: Record<string, unknown>;
  /** Optional search query string. */
  searchQuery?: string;
}

export function useProductListing({
  fetchFn,
  filterParams = {},
  searchQuery = "",
}: UseProductListingOptions) {
  const { currency, locale, loading: storeLoading } = useStore();

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
  const filterParamsKey = JSON.stringify(filterParams);
  const loadIdRef = useRef(0);

  const fetchProducts = useCallback(
    async (page: number, filters: ActiveFilters, query: string) => {
      try {
        const queryParams = buildProductQueryParams(filters, query);
        return await fetchFn(
          { page, per_page: 12, ...queryParams },
          { currency, locale },
        );
      } catch (error) {
        console.error("Failed to fetch products:", error);
        return null;
      }
    },
    [fetchFn, currency, locale],
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
    if (storeLoading) return;
    // Track filterParams changes for re-fetching on soft-nav
    void filterParamsKey;

    let cancelled = false;

    const fetchFilters = async () => {
      setFiltersLoading(true);
      try {
        const params = { ...filterParamsRef.current };
        if (searchQuery) {
          params["q[multi_search]"] = searchQuery;
        }
        const response = await getProductFilters(params, {
          currency,
          locale,
        });
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
  }, [currency, locale, storeLoading, searchQuery, filterParamsKey]);

  // Load products when search query, store context, or filter params change
  useEffect(() => {
    if (storeLoading) return;
    // Track filterParams changes for re-fetching on soft-nav
    void filterParamsKey;
    loadProducts(filtersRef.current, searchQuery);
  }, [storeLoading, searchQuery, loadProducts, filterParamsKey]);

  const handleFilterChange = useCallback(
    (newFilters: ActiveFilters) => {
      if (JSON.stringify(filtersRef.current) !== JSON.stringify(newFilters)) {
        filtersRef.current = newFilters;
        setActiveFilters(newFilters);
        loadProducts(newFilters, searchQuery);
      }
    },
    [loadProducts, searchQuery],
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
