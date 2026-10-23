export type ProductReviewListFilters = {
  rating?: number;
  withMedia?: boolean;
  keyword?: string;
  page?: number;
};

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
