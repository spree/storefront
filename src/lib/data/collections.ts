"use server";

import {
  type Collection,
  type CollectionListParams,
  type PaginatedResponse,
  type Product,
  type ProductFiltersResponse,
  type ProductListParams,
  SpreeError,
} from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { getProductFilters } from "@/lib/data/products";
import { getAccessToken, getClient, getLocaleOptions } from "@/lib/spree";

type LocaleOptions = { locale?: string; country?: string };

/** Fields a collection card needs; keeps the cached index payload small. */
const COLLECTION_CARD_FIELDS = [
  "id",
  "name",
  "permalink",
  "description",
  "products_count",
  "image_url",
  "image_alt",
  "square_image_url",
  "square_image_alt",
];

export async function cachedListCollections(
  params: CollectionListParams,
  options: LocaleOptions,
): Promise<PaginatedResponse<Collection>> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("collections");
  return getClient().collections.list(
    { fields: COLLECTION_CARD_FIELDS, ...params },
    options,
  );
}

/** Pass the route's `{ country, locale }`; cookies are the fallback. */
export async function getCollections(
  params: CollectionListParams = {},
  options?: LocaleOptions,
): Promise<PaginatedResponse<Collection>> {
  return cachedListCollections(params, options ?? (await getLocaleOptions()));
}

/**
 * Persistent cached collection fetch. Returns null only for a real Store API
 * 404 — other failures bubble so they are not cached as not-found. A miss is
 * kept for seconds, not the full TTL, so a collection published after it
 * shows up right away.
 */
export async function cachedGetCollection(
  idOrPermalink: string,
  options: LocaleOptions,
): Promise<Collection | null> {
  "use cache: remote";
  cacheTag("collections", `collection:${idOrPermalink}`);
  try {
    const collection = await getClient().collections.get(
      idOrPermalink,
      {},
      options,
    );
    cacheLife("tenMinutes");
    return collection;
  } catch (error) {
    if (error instanceof SpreeError && error.status === 404) {
      cacheLife("seconds");
      return null;
    }
    throw error;
  }
}

/** Pass the route's `{ country, locale }`; cookies are the fallback. */
export async function getCollection(
  idOrPermalink: string,
  options?: LocaleOptions,
): Promise<Collection | null> {
  return cachedGetCollection(
    idOrPermalink,
    options ?? (await getLocaleOptions()),
  );
}

/**
 * Persistent cached collection products fetch. Goes through the collection's
 * own products endpoint so that, with no `sort`, the merchant's chosen
 * ordering (`sort_order`, including a manual arrangement) applies.
 */
export async function cachedListCollectionProducts(
  collectionId: string,
  params: ProductListParams | undefined,
  options: LocaleOptions,
  _userToken?: string,
): Promise<PaginatedResponse<Product>> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("products", `collection-products:${collectionId}`);
  return getClient().collections.products.list(collectionId, params, options);
}

/**
 * Server action for a collection's product listing. Bind the collection ID
 * (`getCollectionProducts.bind(null, collection.id)`) before handing it to
 * the client-side infinite list.
 */
export async function getCollectionProducts(
  collectionId: string,
  params?: ProductListParams,
): Promise<PaginatedResponse<Product>> {
  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  return cachedListCollectionProducts(collectionId, params, options, userToken);
}

/**
 * Facets for a collection's listing. `collection_id` scopes the counts to the
 * collection and makes `default_sort` the collection's own sort order.
 */
export async function getCollectionFilters(
  collectionId: string,
  params: Record<string, unknown>,
): Promise<ProductFiltersResponse> {
  return getProductFilters({ ...params, collection_id: collectionId });
}
