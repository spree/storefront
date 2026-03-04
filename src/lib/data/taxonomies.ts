"use server";

import {
  getTaxon as _getTaxon,
  getTaxonomy as _getTaxonomy,
  listTaxonomies,
  listTaxons,
} from "@spree/next";
import type { TaxonListParams } from "@spree/sdk";

export async function getTaxonomies(params?: TaxonListParams) {
  return listTaxonomies(params);
}

export async function getTaxonomy(id: string, params?: TaxonListParams) {
  return _getTaxonomy(id, params);
}

export async function getTaxons(params?: TaxonListParams) {
  return listTaxons(params);
}

export async function getTaxon(
  idOrPermalink: string,
  params?: TaxonListParams,
) {
  return _getTaxon(idOrPermalink, params);
}
