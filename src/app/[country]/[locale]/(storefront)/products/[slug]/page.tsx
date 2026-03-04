import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCachedProduct, getCachedStore } from "@/lib/data/cached";
import { generateProductMetadata } from "@/lib/metadata/product";
import { buildCanonicalUrl, buildProductJsonLd } from "@/lib/seo";
import { ProductDetailsWrapper } from "./ProductDetailsWrapper";

interface ProductPageProps {
  params: Promise<{
    country: string;
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { country, locale, slug } = await params;
  return generateProductMetadata({ country, locale, slug });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { country, locale, slug } = await params;
  const basePath = `/${country}/${locale}`;

  let product;
  try {
    product = await getCachedProduct(slug, ["images"], locale);
  } catch {
    product = null;
  }

  let store;
  try {
    store = await getCachedStore(locale);
  } catch {
    store = null;
  }

  const canonicalUrl =
    product && store?.url
      ? buildCanonicalUrl(
          store.url,
          `/${country}/${locale}/products/${product.slug}`,
        )
      : undefined;

  return (
    <>
      {product && canonicalUrl && (
        <JsonLd data={buildProductJsonLd(product, canonicalUrl)} />
      )}
      <ProductDetailsWrapper slug={slug} basePath={basePath} />
    </>
  );
}
