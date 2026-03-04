"use server";

import {
  getProduct as _getProduct,
  getProductFilters as _getProductFilters,
  listProducts,
  listTaxonProducts,
} from "@spree/next";
import type { ProductListParams } from "@spree/sdk";

export async function getProducts(params?: ProductListParams) {
  return listProducts(params);
}

export async function getProduct(
  slugOrId: string,
  params?: { expand?: string },
) {
  return _getProduct(slugOrId, params);
}

export async function getProductFilters(params?: Record<string, unknown>) {
  return _getProductFilters(params);
}

export async function getTaxonProducts(
  taxonId: string,
  params?: ProductListParams,
) {
  return listTaxonProducts(taxonId, params);
}
