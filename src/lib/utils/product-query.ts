import type { ProductListParams } from "@spree/sdk";
import type { ActiveFilters } from "@/types/filters";

/**
 * Build query params from active product filters.
 * Uses flat param keys — the SDK wraps them in q[...] automatically.
 * Sort values are passed directly — the backend handles routing to the right scope.
 */
export function buildProductQueryParams(
  filters: ActiveFilters,
  searchQuery?: string,
): ProductListParams {
  const params: ProductListParams = {};

  if (searchQuery) {
    params.search = searchQuery;
  }

  if (filters.priceMin !== undefined) {
    params.price_gte = filters.priceMin;
  }

  if (filters.priceMax !== undefined) {
    params.price_lte = filters.priceMax;
  }

  if (filters.optionValues.length > 0) {
    params.with_option_value_ids = filters.optionValues;
  }

  if (filters.availability === "in_stock") {
    params.in_stock = true;
  } else if (filters.availability === "out_of_stock") {
    params.out_of_stock = true;
  }

  if (filters.personalizable) {
    params.personalizable = true;
  }

  if (filters.ratingMin !== undefined) {
    params.average_rating_gte = filters.ratingMin;
  }

  const sort =
    filters.sortBy && filters.sortBy !== "manual"
      ? filters.sortBy
      : searchQuery
        ? "relevance"
        : undefined;

  if (sort) {
    params.sort = sort;
  }

  return params;
}

/**
 * Wrap flat param keys in Ransack q[...] format.
 *
 * The SDK does this automatically for `products.list()` via `transformListParams`,
 * but `products.filters()` passes params raw.  We replicate the same wrapping so
 * the backend applies filters when computing facet counts.
 */
export function wrapInRansackParams(
  flat: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === undefined) continue;
    if (key.startsWith("q[")) {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[`q[${key}][]`] = value;
    } else {
      result[`q[${key}]`] = value;
    }
  }
  return result;
}
