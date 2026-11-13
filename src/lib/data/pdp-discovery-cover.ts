import type { Category, Collection, Product } from "@spree/sdk";
import { PRODUCT_CARD_FIELDS } from "@/lib/data/cached";
import { getCategoryProducts } from "@/lib/data/categories";
import { getCollectionProducts } from "@/lib/data/collections";
import { getProducts } from "@/lib/data/products";

const LISTING_SORT = "best_selling";
const SAMPLE_LIMIT = 12;

export function pickProductCoverImage(
  product: Product | undefined,
): string | null {
  if (!product) return null;
  if (product.thumbnail_url) return product.thumbnail_url;
  const primary = product.media?.[0];
  if (!primary) return null;
  return (
    primary.medium_url ??
    primary.small_url ??
    primary.large_url ??
    primary.mini_url ??
    primary.og_image_url ??
    null
  );
}

function pickBestFromList(products: Product[]): string | null {
  for (const product of products) {
    if (!product.purchasable) continue;
    const url = pickProductCoverImage(product);
    if (url) return url;
  }
  for (const product of products) {
    const url = pickProductCoverImage(product);
    if (url) return url;
  }
  return null;
}

export async function resolveCollectionCoverImage(
  collection: Collection,
): Promise<string | null> {
  const fromCollection =
    collection.square_image_url ?? collection.image_url ?? null;
  if (fromCollection) return fromCollection;

  const key = collection.permalink ?? collection.id;
  try {
    const response = await getCollectionProducts(key, {
      limit: SAMPLE_LIMIT,
      sort: LISTING_SORT,
      fields: PRODUCT_CARD_FIELDS,
    });
    return pickBestFromList(response.data ?? []);
  } catch {
    return null;
  }
}

export async function resolveCategoryCoverImage(
  category: Category,
): Promise<string | null> {
  const fromTaxon = category.square_image_url ?? category.image_url ?? null;
  if (fromTaxon) return fromTaxon;

  try {
    const response = await getCategoryProducts(category.id, {
      limit: SAMPLE_LIMIT,
      sort: LISTING_SORT,
      fields: PRODUCT_CARD_FIELDS,
    });
    return pickBestFromList(response.data ?? []);
  } catch {
    return null;
  }
}

export async function resolveSearchTermCoverImage(
  term: string,
): Promise<string | null> {
  const query = term.trim();
  if (!query) return null;

  try {
    const response = await getProducts({
      search: query,
      limit: SAMPLE_LIMIT,
      sort: LISTING_SORT,
      fields: PRODUCT_CARD_FIELDS,
    });
    return pickBestFromList(response.data ?? []);
  } catch {
    return null;
  }
}

export async function resolveCategoryCoverMap(
  categories: Category[],
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    categories.map(
      async (category) =>
        [category.id, await resolveCategoryCoverImage(category)] as const,
    ),
  );
  return new Map(entries);
}

export async function resolveSearchCoverMap(
  terms: string[],
): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    terms.map(
      async (term) =>
        [term.toLowerCase(), await resolveSearchTermCoverImage(term)] as const,
    ),
  );
  return new Map(entries);
}
