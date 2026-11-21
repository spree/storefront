/**
 * Rebuild a page's search params as a `?…` suffix, or "" when there are none,
 * so a redirect keeps the shopper's filters and sort.
 */
export function queryString(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) params.append(key, item);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
