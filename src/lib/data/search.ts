"use server";

import type { Category, Collection, Product, Seller } from "@spree/sdk";
import { getCategories } from "@/lib/data/categories";
import { getCollections } from "@/lib/data/collections";
import { getProducts } from "@/lib/data/products";
import { getSellers } from "@/lib/data/sellers";
import { isMarketplaceEnabled } from "@/lib/spree";

/** Records are trimmed to the fields below via `fields`; the rest are unset. */
export interface QuickSearchResults {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  sellers: Seller[];
}

const PRODUCT_LIMIT = 6;
const CATEGORY_LIMIT = 4;
const COLLECTION_LIMIT = 4;
const SELLER_LIMIT = 4;

/** Settled value, or an empty list when that part of the search failed. */
function valueOrEmpty<T>(
  result: PromiseSettledResult<{ data: T[] }>,
  label: string,
): T[] {
  if (result.status === "fulfilled") return result.value.data;
  console.error(`Quick search for ${label} failed:`, result.reason);
  return [];
}

/**
 * Header search-as-you-type: products, categories, collections and (on
 * marketplace builds) sellers in one round trip. Each group fails on its own, so a broken
 * category lookup still shows product matches.
 */
export async function quickSearch(query: string): Promise<QuickSearchResults> {
  const search = query.trim();
  if (search.length < 2)
    return { products: [], categories: [], collections: [], sellers: [] };

  const [products, categories, collections, sellers] = await Promise.allSettled(
    [
      getProducts({
        search,
        fields: ["id", "name", "slug", "price", "thumbnail_url"],
        limit: PRODUCT_LIMIT,
      }),
      getCategories({
        search,
        fields: ["id", "name", "permalink", "square_image_url", "image_url"],
        limit: CATEGORY_LIMIT,
      }),
      getCollections({
        search,
        fields: ["id", "name", "permalink", "square_image_url", "image_url"],
        limit: COLLECTION_LIMIT,
      }),
      isMarketplaceEnabled()
        ? getSellers({ search, limit: SELLER_LIMIT, sort: "name" })
        : Promise.resolve({ data: [] as Seller[] }),
    ],
  );

  return {
    products: valueOrEmpty<Product>(products, "products"),
    categories: valueOrEmpty<Category>(categories, "categories"),
    collections: valueOrEmpty<Collection>(collections, "collections"),
    sellers: valueOrEmpty<Seller>(sellers, "sellers"),
  };
}
