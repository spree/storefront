import type { Category } from "@spree/sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { MadeTogether } from "@/components/products/MadeTogether";
import { ProductPageDiscoveryExtra } from "@/components/products/ProductPageDiscoveryExtra";
import { ProductReviewsSection } from "@/components/reviews/ProductReviewsSection";
import { ProductReviewsSectionSkeleton } from "@/components/reviews/ProductReviewsSectionSkeleton";
import type { ProductReviewSort } from "@/components/reviews/ProductReviewsSort";
import { JsonLd } from "@/components/seo/JsonLd";
import { ThemePageRenderer } from "@/components/theme/ThemePageRenderer";
import { getCachedProduct, PRODUCT_PAGE_EXPAND } from "@/lib/data/cached";
import { parseCartDiscoveryFromSearchParams } from "@/lib/discovery-context";
import { generateProductMetadata } from "@/lib/metadata/product";
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildProductJsonLd,
} from "@/lib/seo";
import { getStoreUrl } from "@/lib/store";
import { themeTemplateProductEnabled } from "@/lib/theme/flags";
import { productTemplateDiscoverySkip } from "@/lib/theme/product-discovery-skip";
import {
  getActiveTheme,
  getResolvedTemplate,
  themeGroupHasContent,
} from "@/lib/theme/resolver";
import type { ProductThemeContext } from "@/lib/theme/types";
import { ProductDetails } from "./ProductDetails";

interface ProductPageProps {
  params: Promise<{
    country: string;
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    category_id?: string;
    review_sort?: string;
    review_rating?: string;
    review_media?: string;
    review_q?: string;
    review_page?: string;
    src?: string | string[];
    list_id?: string | string[];
    pos?: string | string[];
    seller_id?: string | string[];
    query_id?: string | string[];
    section?: string | string[];
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

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { country, locale, slug } = await params;
  const queryParams = await searchParams;
  const {
    category_id,
    review_sort,
    review_rating,
    review_media,
    review_q,
    review_page,
  } = queryParams;
  const cartDiscovery = parseCartDiscoveryFromSearchParams(queryParams);
  const reviewSort: ProductReviewSort =
    review_sort === "highest" ||
    review_sort === "lowest" ||
    review_sort === "most_helpful"
      ? review_sort
      : "newest";
  const reviewFilters = {
    rating: review_rating ? Number(review_rating) : undefined,
    withMedia: review_media === "1",
    keyword: review_q?.trim() || undefined,
    page: review_page ? Number(review_page) : 1,
  };
  const basePath = `/${country}/${locale}`;

  const themeTemplatesOn = themeTemplateProductEnabled();
  let product;
  let prefetchedTheme: Awaited<ReturnType<typeof getActiveTheme>> = null;
  try {
    if (themeTemplatesOn) {
      [product, prefetchedTheme] = await Promise.all([
        getCachedProduct(slug, PRODUCT_PAGE_EXPAND),
        getActiveTheme(),
      ]);
    } else {
      product = await getCachedProduct(slug, PRODUCT_PAGE_EXPAND);
    }
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

  if (themeTemplatesOn) {
    const [theme, template] = await Promise.all([
      prefetchedTheme ?? getActiveTheme(),
      getResolvedTemplate({
        templateType: "product",
        templateKey: "default",
        resourceType: "Spree::Product",
        resourceId: product.id,
      }),
    ]);
    if (theme && template && themeGroupHasContent(template.data)) {
      const context: ProductThemeContext = {
        kind: "product",
        product,
        basePath,
        locale,
        country,
        reviewSort,
        reviewFilters,
        categoryId: category_id,
        cartDiscovery,
      };
      return (
        <>
          {canonicalUrl && (
            <JsonLd data={buildProductJsonLd(product, canonicalUrl)} />
          )}
          {breadcrumbCategory && storeUrl && (
            <JsonLd
              data={buildBreadcrumbJsonLd(
                breadcrumbCategory,
                basePath,
                storeUrl,
                {
                  name: product.name,
                  slug: product.slug,
                },
              )}
            />
          )}
          <div
            className="bg-marketplace-background"
            data-storefront-product-page
          >
            <ThemePageRenderer
              theme={theme}
              template={template}
              context={context}
            />
            <ProductPageDiscoveryExtra
              product={product}
              basePath={basePath}
              locale={locale}
              currency={product.price?.currency ?? undefined}
              skip={productTemplateDiscoverySkip(template.data)}
            />
          </div>
        </>
      );
    }
  }

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
      <div className="bg-marketplace-background" data-storefront-product-page>
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-10">
          {breadcrumbCategory && (
            <Breadcrumbs
              category={breadcrumbCategory}
              basePath={basePath}
              productName={product.name}
              locale={locale}
            />
          )}
        </div>
        <ProductDetails
          product={product}
          basePath={basePath}
          cartDiscovery={cartDiscovery}
        >
          <Suspense fallback={<ProductReviewsSectionSkeleton embedded />}>
            <MadeTogether productId={product.id} basePath={basePath} />
            <ProductReviewsSection
              product={product}
              locale={locale}
              sort={reviewSort}
              embedded
            />
          </Suspense>
        </ProductDetails>
        <ProductPageDiscoveryExtra
          product={product}
          basePath={basePath}
          locale={locale}
          currency={product.price?.currency ?? undefined}
        />
      </div>
    </>
  );
}
