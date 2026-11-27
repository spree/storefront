import type { Category, Collection, Product, Seller } from "@spree/sdk";

/**
 * Client-safe half of the header quick search: the response shape and the
 * fetch helper. The server half lives in `@/lib/data/search`.
 */

/** Records are trimmed to the fields the dropdown renders; the rest are unset. */
export interface QuickSearchResults {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  sellers: Seller[];
}

export const EMPTY_QUICK_SEARCH_RESULTS: QuickSearchResults = {
  products: [],
  categories: [],
  collections: [],
  sellers: [],
};

/** Shortest query worth sending; shorter input clears the suggestions. */
export const QUICK_SEARCH_MIN_LENGTH = 2;

/** Browser cache lifetime for one query's suggestions, in seconds. */
export const QUICK_SEARCH_MAX_AGE = 60;

export const QUICK_SEARCH_PATH = "/api/search";

export function quickSearchUrl(
  query: string,
  { country, locale }: { country: string; locale: string },
): string {
  const params = new URLSearchParams({ q: query.trim(), country, locale });
  return `${QUICK_SEARCH_PATH}?${params.toString()}`;
}

export interface QuickSearchResponse {
  results: QuickSearchResults;
  /**
   * False when the route answered `no-store`: the results were for a
   * signed-in customer (their catalogs and prices) and must not be reused.
   */
  cacheable: boolean;
}

export async function fetchQuickSearch(
  query: string,
  options: { country: string; locale: string },
): Promise<QuickSearchResponse> {
  const response = await fetch(quickSearchUrl(query, options), {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Quick search failed with status ${response.status}`);
  }
  const cacheControl = response.headers.get("cache-control") ?? "";
  return {
    results: (await response.json()) as QuickSearchResults,
    cacheable: !/\bno-store\b/i.test(cacheControl),
  };
}
