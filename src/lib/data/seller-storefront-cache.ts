/** Cache tag for a public seller shop payload (Next.js `cacheComponents`). */
export function sellerStorefrontCacheTag(slug: string): string {
  return `seller-storefront:${slug.trim().toLowerCase()}`;
}
