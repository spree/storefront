"use client";

import type { PaginatedResponse, Product, ProductListParams } from "@spree/sdk";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ProductCard } from "@/components/products/ProductCard";

interface InfiniteProductListProps {
  initialProducts: Product[];
  initialPage: number;
  totalPages: number;
  /**
   * SDK list params describing the current filter/sort/query state,
   * including the `limit` that the next-page fetch should reuse.
   */
  listParams: ProductListParams;
  /**
   * Server action fetching one page of products. Already bound to any
   * fixed context (e.g. categoryId) on the server before being passed.
   */
  fetchPage: (params: ProductListParams) => Promise<PaginatedResponse<Product>>;
  basePath: string;
  categoryId?: string;
  listId?: string;
  listName?: string;
  currency?: string;
}

/**
 * Infinite-scroll product list. Hydrates with the server-rendered first
 * page already passed in, then fetches subsequent pages via the provided
 * server action when the sentinel enters the viewport.
 *
 * State belongs to this component, not to the URL — infinite scroll is
 * inherently ephemeral "what you've scrolled through" state. Filter / sort
 * changes unmount this component (via the Suspense boundary keyed on the
 * listing state) and remount it with a fresh initial page, which matches
 * user expectations.
 */
export function InfiniteProductList({
  initialProducts,
  initialPage,
  totalPages,
  listParams,
  fetchPage,
  basePath,
  categoryId,
  listId,
  listName,
  currency,
}: InfiniteProductListProps) {
  const t = useTranslations("products");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [currentPage, setCurrentPage] = useState(initialPage);
  // knownPages = the total page count observed from the most recent fetch.
  // hasMore / exhausted state is derived from currentPage < knownPages rather
  // than being mirrored in its own useState, per the "derive during render"
  // rule. Combined with hasError below, this cleanly separates "nothing
  // left to load" from "a load attempt failed".
  const [knownPages, setKnownPages] = useState(totalPages);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Pure pagination state — "are there more pages the server told us
  // about". Error state is tracked separately so a fetch failure
  // doesn't get misinterpreted as "exhausted".
  const hasMore = currentPage < knownPages;

  // Refs mirror the values loadNextPage needs to read without forcing the
  // IntersectionObserver effect to re-subscribe on every state change.
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const knownPagesRef = useRef(knownPages);
  knownPagesRef.current = knownPages;
  const hasErrorRef = useRef(hasError);
  hasErrorRef.current = hasError;
  const isLoadingRef = useRef(false);

  const loadNextPage = useCallback(() => {
    if (isLoadingRef.current || hasErrorRef.current) return;
    const nextPage = currentPageRef.current + 1;
    if (nextPage > knownPagesRef.current) return;
    isLoadingRef.current = true;

    startTransition(async () => {
      try {
        const response = await fetchPage({ ...listParams, page: nextPage });
        setProducts((prev) => {
          const existing = new Set(prev.map((p) => p.id));
          // Track IDs as they are appended, including duplicates within this page.
          const appended = response.data.filter((p) => {
            if (existing.has(p.id)) return false;
            existing.add(p.id);
            return true;
          });
          return [...prev, ...appended];
        });
        setCurrentPage(nextPage);
        setKnownPages(response.meta.pages);
      } catch (error) {
        // Flip the error flag so the IntersectionObserver gate
        // (hasErrorRef) stops re-triggering loadNextPage in a hot
        // loop while the sentinel stays in view, and the render hides
        // the "no more products" message. The user can change filters
        // (which remounts this island) or refresh to try again.
        console.error("InfiniteProductList: failed to load next page", error);
        setHasError(true);
      } finally {
        isLoadingRef.current = false;
      }
    });
  }, [fetchPage, listParams]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            basePath={basePath}
            categoryId={categoryId}
            index={index}
            listId={listId}
            listName={listName}
            fetchPriority={index < 3 ? "high" : undefined}
            currency={currency}
          />
        ))}
      </div>

      <div
        ref={sentinelRef}
        className="h-20 flex items-center justify-center mt-8"
      >
        {isPending && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="animate-spin h-5 w-5" />
            {t("loadingMore")}
          </div>
        )}
        {!hasError && !hasMore && products.length > 0 && (
          <p className="text-gray-500 text-sm">{t("noMoreProducts")}</p>
        )}
      </div>
    </>
  );
}
