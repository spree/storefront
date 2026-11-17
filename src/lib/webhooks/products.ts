import type { Product } from "@spree/sdk";
import { revalidateTag } from "next/cache";
import { cacheTagSuffix, SURFACES } from "@/lib/spree/surface";

/**
 * Product events that can add a product to, change it in, or remove it from
 * the storefront catalog. The webhook endpoint must be subscribed to them in
 * Spree Admin → Settings → Developers → Webhooks.
 *
 * Taking a listing down (seller panel or admin) runs the Draft workflow,
 * which publishes `product.drafted` as well as `product.updated`.
 */
export const PRODUCT_CATALOG_EVENTS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "product.activated",
  "product.approved",
  "product.drafted",
  "product.archived",
] as const;

export type ProductCatalogEvent = (typeof PRODUCT_CATALOG_EVENTS)[number];

/**
 * Stale content is never served after these events: a product taken down
 * must leave search and listings on the very next request, not after a
 * background revalidation.
 */
const EXPIRE_NOW = { expire: 0 };

/**
 * Cache tags holding a product: every product list and search (`products`),
 * the filter facets built from them (`product-filters`), and the product's
 * own detail entries, keyed by prefixed ID or slug.
 */
export function productCacheTags(
  product: Pick<Product, "id" | "slug">,
): string[] {
  return SURFACES.flatMap((surface) => {
    const suffix = cacheTagSuffix(surface);
    return [
      `products${suffix}`,
      `product-filters${suffix}`,
      `product:${product.id}${suffix}`,
      ...(product.slug ? [`product:${product.slug}${suffix}`] : []),
    ];
  });
}

/**
 * Handle a product lifecycle webhook — expire every cached list, search and
 * detail entry that may still show the product as it was.
 */
export async function handleProductChanged(event: {
  data: Pick<Product, "id" | "slug">;
}): Promise<void> {
  for (const tag of productCacheTags(event.data)) {
    revalidateTag(tag, EXPIRE_NOW);
  }
}
