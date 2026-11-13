import type { ActiveFilters } from "@/types/filters";

/** Serialize listing filters for SavedSearch API storage. */
export function activeFiltersToSavedSearchFilters(
  filters: ActiveFilters,
): Record<string, unknown> {
  return {
    ...(filters.priceMin !== undefined ? { price_min: filters.priceMin } : {}),
    ...(filters.priceMax !== undefined ? { price_max: filters.priceMax } : {}),
    ...(filters.availability ? { availability: filters.availability } : {}),
    ...(filters.personalizable ? { personalizable: true } : {}),
    ...(filters.sortBy ? { sort: filters.sortBy } : {}),
    ...(filters.ratingMin !== undefined
      ? { rating_min: filters.ratingMin }
      : {}),
    ...(filters.optionValues.length
      ? { option_values: filters.optionValues }
      : {}),
  };
}

/** Apply saved-search filter JSON onto URL search params. */
export function appendSavedSearchFiltersToParams(
  params: URLSearchParams,
  filters: Record<string, unknown>,
): void {
  if (filters.price_min != null)
    params.set("price_min", String(filters.price_min));
  if (filters.price_max != null)
    params.set("price_max", String(filters.price_max));
  if (filters.availability)
    params.set("availability", String(filters.availability));
  if (filters.personalizable) params.set("personalizable", "1");
  if (filters.sort) params.set("sort", String(filters.sort));
  if (filters.rating_min != null)
    params.set("rating_min", String(filters.rating_min));
  const optionValues = filters.option_values;
  if (Array.isArray(optionValues)) {
    for (const value of optionValues) params.append("option", String(value));
  }
}
