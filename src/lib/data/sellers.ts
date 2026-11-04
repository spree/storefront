"use server";

import {
  type PaginatedResponse,
  type Product,
  type ProductListParams,
  type Seller,
  type SellerFilters,
  type SellerSort,
  SpreeError,
} from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { getAccessToken, getClient, getLocaleOptions } from "@/lib/spree";

type LocaleOptions = { locale?: string; country?: string };

export interface SellerListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: SellerSort;
}

/** Fields a seller card needs; keeps the cached directory payload small. */
const SELLER_CARD_FIELDS = [
  "id",
  "name",
  "slug",
  "about",
  "logo_url",
  "square_logo_url",
  "cover_photo_url",
];

export async function cachedListSellers(
  params: SellerListParams,
  options: LocaleOptions,
): Promise<PaginatedResponse<Seller>> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("sellers");
  const { search, ...rest } = params;
  const filters: SellerFilters = search ? { search } : {};
  return getClient().sellers.list(
    { ...rest, ...filters, fields: SELLER_CARD_FIELDS },
    options,
  );
}

/** Pass the route's `{ country, locale }`; cookies are the fallback. */
export async function getSellers(
  params: SellerListParams = {},
  options?: LocaleOptions,
): Promise<PaginatedResponse<Seller>> {
  return cachedListSellers(params, options ?? (await getLocaleOptions()));
}

/**
 * Persistent cached seller profile fetch. Returns null only for a real
 * Store API 404 (unknown slug, or a seller that is onboarding, suspended or
 * on holiday) — other failures bubble so they are not cached as not-found.
 */
export async function cachedGetSeller(
  slugOrId: string,
  expand: string[],
  options: LocaleOptions,
): Promise<Seller | null> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("sellers", `seller:${slugOrId}`);
  try {
    return await getClient().sellers.get(slugOrId, { expand }, options);
  } catch (error) {
    if (error instanceof SpreeError && error.status === 404) return null;
    throw error;
  }
}

/** Pass the route's `{ country, locale }`; cookies are the fallback. */
export async function getSeller(
  slugOrId: string,
  params?: { expand?: string[] },
  options?: LocaleOptions,
): Promise<Seller | null> {
  return cachedGetSeller(
    slugOrId,
    params?.expand ?? [],
    options ?? (await getLocaleOptions()),
  );
}

/**
 * Persistent cached seller products fetch. Cache key is derived from all
 * function arguments (sellerId, params, locale, country, userToken). Guest
 * users pass undefined so the cache entry is shared.
 */
async function cachedListSellerProducts(
  sellerId: string,
  params: ProductListParams | undefined,
  options: LocaleOptions,
  _userToken?: string,
): Promise<PaginatedResponse<Product>> {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("products", `seller-products:${sellerId}`);
  return getClient().products.list(
    { ...params, seller_id_eq: sellerId },
    options,
  );
}

/**
 * Server action for a seller's product listing. Bind the seller ID
 * (`getSellerProducts.bind(null, seller.id)`) before handing it to the
 * client-side infinite list.
 */
export async function getSellerProducts(
  sellerId: string,
  params?: ProductListParams,
): Promise<PaginatedResponse<Product>> {
  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  return cachedListSellerProducts(sellerId, params, options, userToken);
}
