"use server";

import type { PaginatedResponse, Product, ProductListParams } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { withProductSort } from "@/lib/catalog-sort";
import {
  cacheTagSuffix,
  DEFAULT_SURFACE,
  getAccessToken,
  getClientForSurface,
  getLocaleOptions,
  type Surface,
} from "@/lib/spree";

const EMPTY_PRODUCT_LIST: PaginatedResponse<Product> = {
  data: [],
  meta: {
    page: 1,
    limit: 25,
    count: 0,
    pages: 0,
    from: 0,
    to: 0,
    in: 0,
    previous: null,
    next: null,
  },
};

/**
 * Cached product list fetch. Cache key is derived from all function
 * arguments by Next.js "use cache":
 *
 * - locale/country: determines language and market-specific pricing
 * - surface: DTC vs wholesale — different catalog + channel pricing. Baked
 *   into both the cache tag and the arguments so the two never share entries.
 * - userToken: per-user cache segmentation (separate arg, NOT passed to
 *   SDK). Authenticated users may see different prices (B2B, loyalty).
 *   Each user's JWT is unique so the cache is segmented per user.
 *   Guest users pass undefined. On the wholesale surface the token is
 *   always present — the channel 401s guests.
 */
export async function cachedListProducts(
  params: ProductListParams | undefined,
  options: { locale?: string; country?: string },
  surface: Surface,
  userToken?: string,
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag(`products${cacheTagSuffix(surface)}`);
  try {
    return await getClientForSurface(surface).products.list(
      withProductSort(params),
      {
        ...options,
        // Wholesale catalog requires the customer JWT — the channel is gated.
        ...(surface === "wholesale" && userToken
          ? { token: userToken }
          : undefined),
      },
    );
  } catch {
    return EMPTY_PRODUCT_LIST;
  }
}

export async function getProducts(
  params?: ProductListParams,
  surface: Surface = DEFAULT_SURFACE,
) {
  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  if (userToken) {
    return getClientForSurface(surface)
      .products.list(withProductSort(params), {
        ...options,
        token: userToken,
        cache: "no-store",
      })
      .catch(() => EMPTY_PRODUCT_LIST);
  }
  return cachedListProducts(params, options, surface, userToken);
}

/** Fetch a small, caller-selected set for client-side recently viewed rails. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const selectedIds = [
    ...new Set(ids.filter((id) => typeof id === "string" && id.length > 0)),
  ].slice(0, 8);
  if (selectedIds.length === 0) return [];
  const response = await getProducts({
    id_in: selectedIds,
    limit: selectedIds.length,
    expand: ["seller", "media"],
  });
  const byId = new Map(response.data.map((product) => [product.id, product]));
  return selectedIds.flatMap((id) => byId.get(id) || []);
}

/**
 * Persistent cached product detail fetch. Cache key is derived from:
 *
 * - slugOrId, expand: identify the product and response shape
 * - locale/country: determines language and market-specific pricing
 * - surface: DTC vs wholesale — see cachedListProducts
 * - userToken: per-user cache segmentation (separate arg, NOT passed to
 *   SDK). Authenticated users may see different prices (B2B, loyalty).
 *   Guest users pass undefined, so all guests share one entry.
 */
export async function cachedGetProduct(
  slugOrId: string,
  expand: string[],
  options: { locale?: string; country?: string },
  surface: Surface,
  userToken?: string,
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag(
    `products${cacheTagSuffix(surface)}`,
    `product:${slugOrId}${cacheTagSuffix(surface)}`,
  );
  return getClientForSurface(surface).products.get(
    slugOrId,
    { expand },
    {
      ...options,
      ...(surface === "wholesale" && userToken
        ? { token: userToken }
        : undefined),
    },
  );
}

export async function getProduct(
  slugOrId: string,
  params?: { expand?: string[] },
  surface: Surface = DEFAULT_SURFACE,
) {
  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  if (userToken) {
    return getClientForSurface(surface).products.get(
      slugOrId,
      {
        expand: params?.expand ?? [],
      },
      { ...options, token: userToken, cache: "no-store" },
    );
  }
  return cachedGetProduct(
    slugOrId,
    params?.expand ?? [],
    options,
    surface,
    userToken,
  );
}

async function cachedGetProductFilters(
  params: Record<string, unknown> | undefined,
  options: { locale?: string; country?: string },
  surface: Surface,
  userToken?: string,
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag(`product-filters${cacheTagSuffix(surface)}`);
  return getClientForSurface(surface).products.filters(params, {
    ...options,
    ...(surface === "wholesale" && userToken
      ? { token: userToken }
      : undefined),
  });
}

export async function getProductFilters(
  params?: Record<string, unknown>,
  surface: Surface = DEFAULT_SURFACE,
) {
  const options = await getLocaleOptions();
  const userToken = await getAccessToken();
  return cachedGetProductFilters(params, options, surface, userToken);
}
