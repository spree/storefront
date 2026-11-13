import type { PaginatedProductListResponse } from "@spree/sdk";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ProductDetails } from "@/app/[country]/[locale]/(storefront)/products/[slug]/ProductDetails";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ProductPageRecommendations } from "@/components/products/ProductPageRecommendations";
import { RecentlyViewedProducts } from "@/components/products/RecentlyViewedProducts";
import { ProductReviewsSection } from "@/components/reviews/ProductReviewsSection";
import { ProductReviewsSectionSkeleton } from "@/components/reviews/ProductReviewsSectionSkeleton";
import { getCategoryProducts } from "@/lib/data/categories";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import type { ProductThemeContext } from "@/lib/theme/types";
import { promiseWithTimeout } from "@/lib/utils/promise-with-timeout";

const CATEGORY_NAV_TIMEOUT_MS = 2_500;

const EMPTY_CATEGORY_PRODUCTS: PaginatedProductListResponse = {
  data: [],
  meta: {
    page: 1,
    limit: 100,
    count: 0,
    pages: 0,
    from: 0,
    to: 0,
    in: 0,
    previous: null,
    next: null,
  },
};

async function loadProductNavigation(
  navigationCategoryId: string,
  productId: string,
) {
  try {
    const response = await promiseWithTimeout(
      getCategoryProducts(navigationCategoryId, {
        limit: 100,
        sort: "name",
      }),
      CATEGORY_NAV_TIMEOUT_MS,
      EMPTY_CATEGORY_PRODUCTS,
    );
    const products = response.data || [];
    const currentIndex = products.findIndex((item) => item.id === productId);
    if (currentIndex < 0) return undefined;
    const previous = products[currentIndex - 1];
    const next = products[currentIndex + 1];
    return {
      ...(previous
        ? { previous: { name: previous.name, slug: previous.slug } }
        : {}),
      ...(next ? { next: { name: next.name, slug: next.slug } } : {}),
    };
  } catch {
    return undefined;
  }
}

export async function ProductThemeBody({
  context,
  sectionSettings = {},
  themeSettings = {},
  productBlocks,
  productMediaSettings,
  productMediaBlockId,
  productBlocksActive = false,
  productDescriptionBlockPresent = false,
  productPersonalizationBlockPresent = false,
  documentDriven = false,
  productReviewsSectionPresent = false,
  embeddedReviews,
  showTemplateRelated = true,
  showTemplateRecommended = true,
  showTemplateRecentlyViewed = true,
}: {
  context: ProductThemeContext;
  sectionSettings?: Record<string, unknown>;
  themeSettings?: { product_page?: Record<string, string | boolean> };
  productBlocks?: ReactNode[];
  productMediaSettings?: Record<string, unknown>;
  productMediaBlockId?: string;
  productBlocksActive?: boolean;
  productDescriptionBlockPresent?: boolean;
  productPersonalizationBlockPresent?: boolean;
  documentDriven?: boolean;
  productReviewsSectionPresent?: boolean;
  embeddedReviews?: ReactNode;
  showTemplateRelated?: boolean;
  showTemplateRecommended?: boolean;
  showTemplateRecentlyViewed?: boolean;
}) {
  const {
    product,
    basePath,
    locale,
    reviewSort = "newest",
    categoryId,
  } = context;
  const breadcrumbCategory = product.categories?.find((category) =>
    categoryId ? category.id === categoryId : true,
  );
  let productNavigation:
    | {
        previous?: { name: string; slug: string };
        next?: { name: string; slug: string };
      }
    | undefined;
  const navigationCategoryId = categoryId || breadcrumbCategory?.id;
  if (
    themeSettingEnabled(sectionSettings.product_navigation) &&
    navigationCategoryId
  ) {
    productNavigation = await loadProductNavigation(
      navigationCategoryId,
      product.id,
    );
  }

  return (
    <>
      <div className="container mx-auto hidden px-4 pt-6 sm:px-6 lg:px-8 md:block">
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
        cartDiscovery={context.cartDiscovery}
        appearance={{
          ...sectionSettings,
          gallery_style:
            sectionSettings.gallery_layout === "thumbnails_bottom"
              ? "thumbnails_bottom"
              : "thumbnails_left",
          layout:
            sectionSettings.section_width === "full" ? "wide" : "standard",
          sticky_info: sectionSettings.sticky_info,
          product_media_width: sectionSettings.media_width,
          product_desktop_spacing: sectionSettings.desktop_spacing,
          product_mobile_spacing: sectionSettings.mobile_spacing,
        }}
        globalSettings={themeSettings.product_page}
        productNavigation={productNavigation}
        templateBlocks={undefined}
        templateDescriptionBlockPresent={productDescriptionBlockPresent}
        templatePersonalizationBlockPresent={productPersonalizationBlockPresent}
        templateMediaSettings={productMediaSettings}
        templateMediaBlockId={productMediaBlockId}
        madeTogether={context.madeTogether ?? null}
      >
        {embeddedReviews ??
          (((documentDriven && !productReviewsSectionPresent) ||
            (!documentDriven && !productBlocksActive)) &&
          themeSettingEnabled(themeSettings.product_page?.show_reviews, true) &&
          themeSettingEnabled(sectionSettings.show_reviews, true) ? (
            <Suspense fallback={<ProductReviewsSectionSkeleton embedded />}>
              <ProductReviewsSection
                product={product}
                locale={locale}
                sort={reviewSort}
                embedded
              />
            </Suspense>
          ) : null)}
      </ProductDetails>
      {!documentDriven &&
      productBlocksActive &&
      themeSettingEnabled(themeSettings.product_page?.show_reviews, true) &&
      themeSettingEnabled(sectionSettings.show_reviews, true) ? (
        <Suspense fallback={<ProductReviewsSectionSkeleton />}>
          <ProductReviewsSection
            product={product}
            locale={locale}
            sort={reviewSort}
          />
        </Suspense>
      ) : null}
      {!documentDriven &&
      ((showTemplateRelated &&
        themeSettingEnabled(themeSettings.product_page?.show_related, true)) ||
        (showTemplateRecommended &&
          themeSettingEnabled(
            themeSettings.product_page?.show_recommended,
            true,
          ))) ? (
        <Suspense fallback={null}>
          <ProductPageRecommendations
            productId={product.id}
            sellerName={product.seller?.name ?? product.seller_name}
            basePath={basePath}
            currency={product.price?.currency ?? undefined}
            locale={locale}
            showRelated={
              showTemplateRelated &&
              themeSettingEnabled(
                themeSettings.product_page?.show_related,
                true,
              )
            }
            showRecommended={
              showTemplateRecommended &&
              themeSettingEnabled(
                themeSettings.product_page?.show_recommended,
                true,
              )
            }
          />
        </Suspense>
      ) : null}
      {!documentDriven &&
      showTemplateRecentlyViewed &&
      themeSettingEnabled(themeSettings.product_page?.show_recently_viewed) ? (
        <Suspense fallback={null}>
          <RecentlyViewedProducts
            productId={product.id}
            basePath={basePath}
            currency={product.price?.currency ?? undefined}
          />
        </Suspense>
      ) : null}
    </>
  );
}
