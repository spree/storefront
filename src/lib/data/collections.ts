"use server";

import type { PaginatedResponse, Product, ProductListParams } from "@spree/sdk";
import { cacheLife, cacheTag } from "next/cache";
import { getClient, getLocaleOptions } from "@/lib/spree";

export interface StoreCollection {
  id: string;
  name: string;
  permalink: string;
  position: number;
  sort_order: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  products_count: number;
  description: string;
  description_html: string;
  image_url: string | null;
  square_image_url: string | null;
}

type ApiParam = string | number | boolean | (string | number)[] | undefined;

function toApiParams(params: ProductListParams = {}): Record<string, ApiParam> {
  const apiParams: Record<string, ApiParam> = {};

  for (const [key, value] of Object.entries(params)) {
    if (key === "fields") continue;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      (Array.isArray(value) &&
        value.every(
          (item) => typeof item === "string" || typeof item === "number",
        ))
    ) {
      apiParams[key] = value as ApiParam;
    }
  }

  return apiParams;
}

async function cachedListCollections(options: {
  locale?: string;
  country?: string;
}) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("collections");
  return getClient().request<PaginatedResponse<StoreCollection>>(
    "GET",
    "/collections",
    { ...options, params: { limit: 100 } },
  );
}

export async function getCollections() {
  const options = await getLocaleOptions();
  return cachedListCollections(options);
}

async function cachedGetCollection(
  permalink: string,
  options: { locale?: string; country?: string },
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("collections", `collection:${permalink}`);
  return getClient().request<StoreCollection>(
    "GET",
    `/collections/${encodeURIComponent(permalink)}`,
    options,
  );
}

export async function getCollection(permalink: string) {
  const options = await getLocaleOptions();
  return cachedGetCollection(permalink, options);
}

async function cachedListCollectionProducts(
  collectionId: string,
  params: ProductListParams | undefined,
  options: { locale?: string; country?: string },
) {
  "use cache: remote";
  cacheLife("tenMinutes");
  cacheTag("products", `collection-products:${collectionId}`);
  return getClient().request<PaginatedResponse<Product>>(
    "GET",
    `/collections/${encodeURIComponent(collectionId)}/products`,
    { ...options, params: toApiParams(params) },
  );
}

export async function getCollectionProducts(
  collectionId: string,
  params?: ProductListParams,
) {
  const options = await getLocaleOptions();
  return cachedListCollectionProducts(collectionId, params, options);
}
