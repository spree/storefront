/** Embedded PDP preview row count (server-safe; do not import from client modules). */
export const PDP_PREVIEW_REVIEW_LIMIT = 5;

export function resolveProductReviewCount(
  reportedCount: number | null | undefined,
  aggregateCount: number,
  loadedCount: number,
): number {
  return Math.max(reportedCount ?? aggregateCount, loadedCount);
}

export type ProductReviewListFilters = {
  rating?: number;
  withMedia?: boolean;
  keyword?: string;
  page?: number;
};

export function buildReviewListSearchParams(
  sort: string,
  filters: ProductReviewListFilters,
  page?: number,
): URLSearchParams {
  const params = new URLSearchParams();
  if (sort && sort !== "newest") {
    params.set("review_sort", sort);
  }
  if (filters.rating) {
    params.set("review_rating", String(filters.rating));
  }
  if (filters.withMedia) {
    params.set("review_media", "1");
  }
  if (filters.keyword) {
    params.set("review_q", filters.keyword);
  }
  const pageNumber = page ?? filters.page ?? 1;
  if (pageNumber > 1) {
    params.set("review_page", String(pageNumber));
  }
  return params;
}

export function buildReviewListHref(
  sort: string,
  filters: ProductReviewListFilters,
  page: number,
): string {
  const query = buildReviewListSearchParams(sort, filters, page).toString();
  return query ? `?${query}` : "";
}

export function buildReviewListQuery(
  sort: string,
  filters: ProductReviewListFilters,
  limit: number,
) {
  const q: Record<string, string | number | boolean> = {};
  if (filters.rating) q.rating_eq = filters.rating;
  if (filters.withMedia) q.with_media = true;
  if (filters.keyword) q.body_cont = filters.keyword;

  return {
    sort,
    limit,
    page: filters.page ?? 1,
    ...(Object.keys(q).length > 0 ? { q } : {}),
  };
}
