import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscoveryRecommendationRail } from "@/components/products/DiscoveryRecommendationRail";
import { ProductListing } from "@/components/products/ProductListing";
import { ProductRecommendationRail } from "@/components/products/ProductRecommendationRail";
import { JsonLd } from "@/components/seo/JsonLd";
import { ThemePageRenderer } from "@/components/theme/ThemePageRenderer";
import { getCategory, getCategoryProducts } from "@/lib/data/categories";
import { resolveCurrency } from "@/lib/data/markets";
import { getMerchandisingPlacements } from "@/lib/data/merchandising";
import { getProductFilters } from "@/lib/data/products";
import {
  firstPlacementOfKind,
  placementsOfKind,
} from "@/lib/merchandising-placements";
import { generateCategoryMetadata } from "@/lib/metadata/category";
import { buildBreadcrumbJsonLd } from "@/lib/seo";
import { getStoreUrl } from "@/lib/store";
import { themeTemplateCategoryEnabled } from "@/lib/theme/flags";
import {
  getActiveTheme,
  getResolvedTemplate,
  themeGroupHasContent,
} from "@/lib/theme/resolver";
import { parseListingSearchParams } from "@/lib/utils/listing-search-params";
import { CategoryBanner } from "./CategoryBanner";

interface CategoryPageProps {
  params: Promise<{
    country: string;
    locale: string;
    permalink: string[];
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { country, locale, permalink } = await params;
  return generateCategoryMetadata({ country, locale, permalink });
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { country, locale, permalink } = await params;
  const rawSearchParams = await searchParams;
  const fullPermalink = permalink.join("/");
  const basePath = `/${country}/${locale}`;

  let category;
  try {
    category = await getCategory(fullPermalink, {
      expand: ["ancestors", "children"],
    });
  } catch (error) {
    console.error("Failed to fetch category:", error);
    notFound();
  }

  if (!category) {
    notFound();
  }

  const storeUrl = getStoreUrl();
  const currency = await resolveCurrency(country);
  const listingState = parseListingSearchParams(rawSearchParams);

  // Pre-bind categoryId onto the server action so the client-side
  // InfiniteProductList island gets a single-arg (params) fetcher it can
  // call directly. Inline arrow closures don't serialize across the
  // server→client boundary; `.bind()` on a server action reference does.
  const fetchCategoryProducts = getCategoryProducts.bind(null, category.id);
  const merchandising = await getMerchandisingPlacements({
    surface: "category",
    category_id: category.id,
  });
  const categoryHero = firstPlacementOfKind(merchandising, "category_hero");
  const featuredRails = placementsOfKind(
    merchandising,
    "featured_collection",
  ).concat(placementsOfKind(merchandising, "featured_products"));

  if (themeTemplateCategoryEnabled()) {
    const theme = await getActiveTheme();
    if (theme) {
      const template = await getResolvedTemplate({
        templateType: "category",
        templateKey: "default",
        resourceType: "Spree::Category",
        resourceId: category.id,
      });
      if (template && themeGroupHasContent(template.data)) {
        return (
          <>
            {storeUrl && (
              <JsonLd
                data={buildBreadcrumbJsonLd(category, basePath, storeUrl)}
              />
            )}
            <ThemePageRenderer
              theme={theme}
              template={template}
              context={{
                kind: "category",
                categoryId: category.id,
                categoryName: category.name,
                categorySlug: category.permalink,
                listingSearchParams: rawSearchParams,
                basePath,
                locale,
                country,
                currency,
              }}
            />
          </>
        );
      }
    }
  }

  return (
    <div>
      {storeUrl && (
        <JsonLd data={buildBreadcrumbJsonLd(category, basePath, storeUrl)} />
      )}

      {categoryHero?.heading || categoryHero?.title ? (
        <div className="mx-auto max-w-[var(--marketplace-container)] px-4 pt-8 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-wide text-marketplace-muted-foreground">
            {category.name}
          </p>
          <h1 className="marketplace-listing-title mt-2 text-balance text-marketplace-foreground">
            {categoryHero.heading || categoryHero.title}
          </h1>
          {categoryHero.body ? (
            <p className="mt-3 max-w-2xl text-marketplace-muted-foreground">
              {categoryHero.body}
            </p>
          ) : null}
        </div>
      ) : (
        <CategoryBanner
          category={category}
          basePath={basePath}
          locale={locale}
        />
      )}

      <DiscoveryRecommendationRail
        context={{ surface: "category", categoryId: category.id }}
        basePath={basePath}
        currency={currency}
        locale={locale}
        listId={`category-discovery-${category.id}`}
        dismissSurface={`category:${category.id}`}
      />

      {featuredRails.map((placement) =>
        placement.products.length ? (
          <ProductRecommendationRail
            key={placement.id}
            title={placement.title || placement.heading || ""}
            products={placement.products}
            basePath={basePath}
            currency={currency}
            listId={`merchandising-${placement.id}`}
            listName={placement.title || placement.campaign_name}
          />
        ) : null,
      )}

      <div className="mx-auto max-w-[var(--marketplace-container)] px-4 pt-6 sm:px-6 lg:px-8">
        <ProductListing
          state={listingState}
          basePath={basePath}
          currency={currency}
          locale={locale as Locale}
          listId={`category-${category.id}`}
          listName={`Category: ${category.name}`}
          categoryId={category.id}
          baseParams={{ in_category: category.id }}
          fetchProducts={fetchCategoryProducts}
          fetchFilters={getProductFilters}
        />
      </div>
    </div>
  );
}
