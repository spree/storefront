import type { Category } from "@spree/sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCachedProduct, PRODUCT_PAGE_EXPAND } from "@/lib/data/cached";
import { generateProductMetadata } from "@/lib/metadata/product";
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildProductJsonLd,
} from "@/lib/seo";
import { getStoreUrl } from "@/lib/store";
import { ProductDetails } from "./ProductDetails";

interface ProductPageProps {
  params: Promise<{
    country: string;
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    category_id?: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { country, locale, slug } = await params;
  return generateProductMetadata({ country, locale, slug });
}

function findBreadcrumbCategory(
  categories: Category[],
  categoryId?: string,
): Category | undefined {
  if (categories.length === 0) return undefined;
  if (categoryId) {
    const match = categories.find((c) => c.id === categoryId);
    if (match) return match;
  }
  return categories[0];
}

/**
 * The product slug is only known per request, so the page body streams behind
 * a skeleton instead of blocking the navigation.
 */
export default function ProductPage(props: ProductPageProps) {
  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductPageContent {...props} />
    </Suspense>
  );
}

function ProductPageSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse motion-reduce:animate-none"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="aspect-square rounded-lg bg-gray-200" />
        <div className="space-y-4">
          <div className="h-9 w-3/4 rounded bg-gray-200" />
          <div className="h-6 w-1/4 rounded bg-gray-200" />
          <div className="h-24 rounded bg-gray-100" />
          <div className="h-12 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

async function ProductPageContent({ params, searchParams }: ProductPageProps) {
  const { country, locale, slug } = await params;
  const { category_id } = await searchParams;
  const basePath = `/${country}/${locale}`;

  let product;
  try {
    product = await getCachedProduct(slug, PRODUCT_PAGE_EXPAND);
  } catch {
    notFound();
  }

  const storeUrl = getStoreUrl();
  const canonicalUrl = storeUrl
    ? buildCanonicalUrl(
        storeUrl,
        `/${country}/${locale}/products/${product.slug}`,
      )
    : undefined;

  const breadcrumbCategory = findBreadcrumbCategory(
    product.categories || [],
    category_id,
  );

  return (
    <>
      {canonicalUrl && (
        <JsonLd data={buildProductJsonLd(product, canonicalUrl)} />
      )}
      {breadcrumbCategory && storeUrl && (
        <JsonLd
          data={buildBreadcrumbJsonLd(breadcrumbCategory, basePath, storeUrl, {
            name: product.name,
            slug: product.slug,
          })}
        />
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {breadcrumbCategory && (
          <Breadcrumbs
            category={breadcrumbCategory}
            basePath={basePath}
            productName={product.name}
            locale={locale}
          />
        )}
      </div>
      <ProductDetails product={product} basePath={basePath} />
    </>
  );
}
