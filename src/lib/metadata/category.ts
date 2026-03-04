import type { Metadata } from "next";
import { getCachedStore, getCachedTaxon } from "@/lib/data/cached";
import { buildCanonicalUrl } from "@/lib/seo";

export interface CategoryMetadataParams {
  country: string;
  locale: string;
  permalink: string[];
}

export async function generateCategoryMetadata({
  country,
  locale,
  permalink,
}: CategoryMetadataParams): Promise<Metadata> {
  const fullPermalink = permalink.join("/");

  let taxon;
  try {
    taxon = await getCachedTaxon(
      fullPermalink,
      ["ancestors", "children"],
      locale,
    );
  } catch {
    return { title: "Category Not Found" };
  }

  let store;
  try {
    store = await getCachedStore(locale);
  } catch {
    store = null;
  }

  const title = taxon.meta_title || taxon.name;
  const description =
    taxon.meta_description ||
    taxon.description ||
    `Browse ${taxon.name} products.`;

  const canonicalUrl = store?.url
    ? buildCanonicalUrl(store.url, `/${country}/${locale}/t/${taxon.permalink}`)
    : undefined;

  return {
    title,
    description,
    ...(taxon.meta_keywords ? { keywords: taxon.meta_keywords } : {}),
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
    openGraph: {
      title,
      description,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      type: "website",
      ...(taxon.image_url
        ? { images: [{ url: taxon.image_url, alt: taxon.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(taxon.image_url ? { images: [taxon.image_url] } : {}),
    },
  };
}
