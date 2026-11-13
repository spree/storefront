import type { OrderSort, ProductSort, SellerSort } from "@spree/sdk";

/**
 * Maps storefront / CMS sort tokens to Store API `ProductSort` values.
 * The API has no `popular` key — `best_selling` is the closest catalog ordering.
 */
export function toProductSort(
  sort: string | undefined,
): ProductSort | undefined {
  if (!sort) return undefined;
  switch (sort) {
    case "popular":
      return "best_selling";
    case "newest":
      return "-created_at";
    default:
      return sort as ProductSort;
  }
}

/** Normalizes legacy order list sort strings from account pages. */
export function toOrderSort(sort: string | undefined): OrderSort | undefined {
  if (!sort) return undefined;
  const trimmed = sort.trim();
  if (/^completed_at\s+desc$/i.test(trimmed)) {
    return "-completed_at";
  }
  return trimmed as OrderSort;
}

/**
 * Seller profile lists may request rating order in theme JSON; the generated
 * sort keys do not include `average_rating`, so we fall back to name order.
 */
export function toSellerSort(sort: string | undefined): SellerSort | undefined {
  if (!sort) return undefined;
  if (sort === "-average_rating" || sort === "average_rating") {
    return "name";
  }
  return sort as SellerSort;
}

export function withProductSort<T extends { sort?: string }>(
  params: T | undefined,
): (Omit<T, "sort"> & { sort?: ProductSort }) | undefined {
  if (!params) return undefined;
  const { sort, ...rest } = params;
  const apiSort = toProductSort(sort);
  return apiSort ? { ...rest, sort: apiSort } : rest;
}
