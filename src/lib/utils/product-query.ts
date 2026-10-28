import type { ProductListParams, ProductSort } from "@spree/sdk";
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
    params.price_gte = String(filters.priceMin);
  }

  if (filters.priceMax !== undefined) {
    params.price_lte = String(filters.priceMax);
  }

  if (filters.optionValues.length > 0) {
    params.with_option_value_ids = filters.optionValues;
  }

  if (filters.availability === "in_stock") {
    params.in_stock = true;
  } else if (filters.availability === "out_of_stock") {
    params.out_of_stock = true;
  }

  if (filters.sortBy && filters.sortBy !== "manual") {
    // Read from the URL as text; the API validates the value.
    params.sort = filters.sortBy as ProductSort;
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
