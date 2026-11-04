import { cache } from "react";
import type { Surface } from "@/lib/spree";
import { getCategory } from "./categories";
import { getProduct } from "./products";

/** Expand list used on the product detail page. */
export const PRODUCT_PAGE_EXPAND = [
  "default_variant",
  "variants",
  "media",
  "option_types",
  "custom_fields",
  "categories.ancestors",
];

/** Product page expand on marketplace builds: adds the "Sold by" seller. */
export const MARKETPLACE_PRODUCT_PAGE_EXPAND = [
  ...PRODUCT_PAGE_EXPAND,
  "seller",
];

/** Slim expand used by generateProductMetadata (needs only the primary image for og:image). */
export const PRODUCT_METADATA_EXPAND = ["primary_media"];

/**
 * Minimal set of Product fields required to render a <ProductCard> and
 * fire listing analytics. Passed via the SDK's `fields` param on listing
 * fetches so Spree returns a narrowed payload — this shrinks the cached
 * entry, the RSC→client serialization, and the streaming HTML size.
 *
 * `categories` is included so `mapProductToGA4Item` can populate the
 * GA4 `item_category` attribute on view_item_list / select_item events.
 */
export const PRODUCT_CARD_FIELDS = [
  "id",
  "name",
  "slug",
  "thumbnail_url",
  "purchasable",
  "default_variant_id",
  "price",
  "original_price",
  "categories",
];

export const getCachedProduct = cache(
  (slugOrId: string, expand: string[], surface: Surface = "dtc") =>
    getProduct(slugOrId, { expand }, surface),
);

export const getCachedCategory = cache(
  (idOrPermalink: string, expand: string[]) =>
    getCategory(idOrPermalink, { expand }),
);
