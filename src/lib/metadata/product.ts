import type { Metadata } from "next";
import { getCachedProduct, getCachedStore } from "@/lib/data/cached";
import { buildCanonicalUrl, stripHtml } from "@/lib/seo";

interface ProductMetadataParams {
  country: string;
  locale: string;
  slug: string;
}

export async function generateProductMetadata({
  country,
  locale,
  slug,
}: ProductMetadataParams): Promise<Metadata> {
  let product;
  try {
    product = await getCachedProduct(slug, ["images"], locale);
  } catch {
    return { title: "Product Not Found" };
  }

  let store;
  try {
    store = await getCachedStore(locale);
  } catch {
    store = null;
  }

  const title = product.name;
  const description = product.meta_description
    ? product.meta_description
    : product.description
      ? stripHtml(product.description).slice(0, 160)
      : `Shop ${product.name}`;

  const canonicalUrl = store?.url
    ? buildCanonicalUrl(
        store.url,
        `/${country}/${locale}/products/${product.slug}`,
      )
    : undefined;

  const ogImages = (product.images || [])
    .filter((img) => img.og_image_url || img.original_url)
    .map((img) => ({
      url: (img.og_image_url || img.original_url)!,
      alt: img.alt || product.name,
    }));

  // Fall back to thumbnail_url if no images from includes
  if (ogImages.length === 0 && product.thumbnail_url) {
    ogImages.push({ url: product.thumbnail_url, alt: product.name });
  }

  return {
    title,
    description,
    ...(product.meta_keywords ? { keywords: product.meta_keywords } : {}),
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
    openGraph: {
      title,
      description,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      type: "website",
      ...(ogImages.length > 0 ? { images: ogImages } : {}),
    },
    other: {
      ...(product.price?.amount
        ? { "product:price:amount": product.price.amount }
        : {}),
      ...(product.price?.currency
        ? { "product:price:currency": product.price.currency }
        : {}),
    },
  };
}
