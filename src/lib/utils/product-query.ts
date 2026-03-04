import type { ProductListParams } from "@spree/sdk";
import type { ActiveFilters } from "@/components/products/ProductFilters";

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
    params.multi_search = searchQuery;
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

  if (filters.sortBy && filters.sortBy !== "manual") {
    params.sort = filters.sortBy;
  }

  return params;
}
