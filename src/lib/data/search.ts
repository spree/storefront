import type { Category, Collection, Product, Seller } from "@spree/sdk";
import { getCategories } from "@/lib/data/categories";
import { getCollections } from "@/lib/data/collections";
import { cachedListProducts } from "@/lib/data/products";
import { getSellers } from "@/lib/data/sellers";
import {
  DEFAULT_SURFACE,
  getAccessToken,
  isMarketplaceEnabled,
} from "@/lib/spree";
import {
  EMPTY_QUICK_SEARCH_RESULTS,
  QUICK_SEARCH_MIN_LENGTH,
  type QuickSearchResults,
} from "@/lib/utils/quick-search";
import { withTimeout } from "@/lib/utils/with-timeout";

const PRODUCT_LIMIT = 6;
const CATEGORY_LIMIT = 4;
const COLLECTION_LIMIT = 4;
const SELLER_LIMIT = 4;
/** Collections are a side group; a slow lookup leaves it empty. */
const COLLECTION_DEADLINE_MS = 1500;

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
 * marketplace builds) sellers in one round trip. Each group fails on its own,
 * so a broken category lookup still shows product matches.
 *
 * Served by the `GET /api/search` Route Handler rather than a Server Action:
 * Next.js runs Server Actions one at a time, so outdated keystrokes would
 * queue ahead of the latest query.
 */
export async function quickSearch(
  query: string,
  options: { locale: string; country: string },
): Promise<QuickSearchResults> {
  const search = query.trim();
  if (search.length < QUICK_SEARCH_MIN_LENGTH)
    return EMPTY_QUICK_SEARCH_RESULTS;

  const userToken = await getAccessToken();

  const [products, categories, collections, sellers] = await Promise.allSettled(
    [
      cachedListProducts(
        {
          search,
          fields: ["id", "name", "slug", "price", "thumbnail_url"],
          limit: PRODUCT_LIMIT,
        },
        options,
        DEFAULT_SURFACE,
        userToken,
      ),
      getCategories(
        {
          search,
          fields: ["id", "name", "permalink", "square_image_url", "image_url"],
          limit: CATEGORY_LIMIT,
        },
        options,
      ),
      withTimeout<{ data: Collection[] }>(
        getCollections(
          {
            search,
            fields: [
              "id",
              "name",
              "permalink",
              "square_image_url",
              "image_url",
            ],
            limit: COLLECTION_LIMIT,
          },
          options,
        ),
        COLLECTION_DEADLINE_MS,
        { data: [] as Collection[] },
      ),
      isMarketplaceEnabled()
        ? getSellers({ search, limit: SELLER_LIMIT, sort: "name" }, options)
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
