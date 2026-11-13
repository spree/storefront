import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SponsoredDiscoveryRailSection } from "@/components/ads/SponsoredDiscoveryRailSection";
import { ProductGrid } from "@/components/products/ProductGrid";
import { getProductsByIds } from "@/lib/data/products";
import type { SellerShopSection } from "@/lib/data/seller-storefront-types";
import { getSellerProducts } from "@/lib/data/sellers";
import {
  buildSellerShopProductQuery,
  sellerShopCatalogPath,
  sellerShopShellClass,
} from "@/lib/utils/seller-storefront";
import { SellerFeaturedGrid } from "./SellerFeaturedGrid";
import { SellerShopProductFilters } from "./SellerShopProductFilters";
import { SellerShopSidebar } from "./SellerShopSidebar";
import { SellerShopSortForm } from "./SellerShopSortForm";
import { ShopEditorAction } from "./ShopEditorAction";

const SELLER_SHOP_PRODUCTS_PER_PAGE = 24;

interface SellerStorefrontProductsProps {
  slug: string;
  sellerId: string;
  basePath: string;
  locale: string;
  sections: SellerShopSection[];
  featuredIds: string[];
  page: number;
  section?: string;
  query?: string;
  sort?: string;
  onSale?: string;
  shopPath: string;
  totalItemCount: number;
  salesCount?: number;
  followersCount?: number;
  customOrderHref?: string;
  marketplaceName: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  personalizable?: string;
  featuredLayout?: "standard" | "mixed_grid" | "none";
  editorPreview?: boolean;
}

export async function SellerStorefrontProducts({
  slug,
  sellerId,
  basePath,
  locale,
  sections,
  featuredIds,
  page,
  section,
  query,
  sort,
  onSale,
  totalItemCount,
  salesCount,
  followersCount,
  customOrderHref,
  shopPath,
  marketplaceName,
  minPrice,
  maxPrice,
  minRating,
  personalizable,
  featuredLayout = "standard",
  editorPreview = false,
}: SellerStorefrontProductsProps) {
  const t = await getTranslations("sellers");
  const catalogQuery = buildSellerShopProductQuery({
    textQuery: query,
    onSale,
    minPrice,
    maxPrice,
    minRating,
    personalizable,
  });

  const products = await getSellerProducts(slug, {
    sellerId,
    page,
    limit: SELLER_SHOP_PRODUCTS_PER_PAGE,
    section,
    sort: sort || undefined,
    q: catalogQuery,
  });

  const shopProductsPath = `${basePath}/sellers/${slug}`;
  const catalogLinkParams = {
    section,
    q: query,
    sort,
    sale: onSale,
    min_price: minPrice,
    max_price: maxPrice,
    min_rating: minRating,
    personalizable,
  };
  const pageCount = Math.max(products.meta.pages || 1, 1);
  const paginationItems: Array<number | string> = [];
  const visiblePageNumbers = Array.from(
    new Set(
      [1, page - 1, page, page + 1, pageCount].filter(
        (pageNumber) => pageNumber >= 1 && pageNumber <= pageCount,
      ),
    ),
  ).sort((a, b) => a - b);
  visiblePageNumbers.forEach((pageNumber, index) => {
    if (index > 0 && pageNumber - visiblePageNumbers[index - 1] > 1) {
      paginationItems.push(`ellipsis-${pageNumber}`);
    }
    paginationItems.push(pageNumber);
  });

  const showFeatured =
    (editorPreview || page === 1) &&
    !section &&
    !query &&
    !onSale &&
    !minPrice &&
    !maxPrice &&
    !minRating &&
    !personalizable &&
    (featuredIds.length > 0 || editorPreview) &&
    featuredLayout !== "none";
  const featuredProducts = showFeatured
    ? await getProductsByIds(featuredIds.slice(0, 8))
    : [];

  const sectionTitle = section
    ? (sections.find((s) => s.slug === section)?.name ?? t("tab_products"))
    : t("allItemsHeading");

  return (
    <div id="shop-items" className="bg-white pb-12 pt-7">
      <div className={sellerShopShellClass}>
        <div className="md:grid md:grid-cols-[minmax(11rem,13rem)_minmax(0,1fr)] md:gap-6 lg:gap-8 xl:gap-10">
          <SellerShopSidebar
            slug={slug}
            basePath={basePath}
            sections={sections}
            activeSection={section}
            totalItemCount={totalItemCount}
            salesCount={salesCount}
            followersCount={followersCount}
            customOrderHref={customOrderHref}
            shopPath={shopPath}
            sellerId={sellerId}
            sellerSlug={slug}
            marketplaceName={marketplaceName}
          />

          <div className="min-w-0 md:pt-0">
            {showFeatured ? (
              <section className="mb-10" data-seller-featured-section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#222]">
                    {t("featuredTitle")}
                  </h2>
                  {editorPreview ? (
                    <div className="flex items-center gap-1">
                      <ShopEditorAction
                        action="featured-layout"
                        label="Change featured layout"
                        className="inline-flex size-8 items-center justify-center rounded-sm text-marketplace-muted-foreground hover:bg-marketplace-surface-subtle hover:text-marketplace-foreground"
                      />
                      <ShopEditorAction
                        action="featured"
                        label="Edit featured listings"
                        className="inline-flex size-8 items-center justify-center rounded-sm text-marketplace-muted-foreground hover:bg-marketplace-surface-subtle hover:text-marketplace-foreground"
                      />
                    </div>
                  ) : null}
                </div>
                {featuredProducts.length === 0 && editorPreview ? (
                  <ShopEditorAction
                    action="featured"
                    icon="plus"
                    label="Add featured listings"
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-sm border border-dashed border-marketplace-border text-sm font-medium text-marketplace-muted-foreground hover:border-marketplace-foreground hover:text-marketplace-foreground"
                  />
                ) : featuredLayout === "mixed_grid" ? (
                  <SellerFeaturedGrid
                    products={featuredProducts}
                    basePath={basePath}
                    sellerId={sellerId}
                    listId="seller-shop-featured"
                    listName={t("featuredTitle")}
                  />
                ) : (
                  <ProductGrid
                    products={featuredProducts}
                    basePath={basePath}
                    listId="seller-shop-featured"
                    listName={t("featuredTitle")}
                    density="rail"
                    columns={4}
                    mobileColumns={2}
                    gap={12}
                    sellerShopDiscovery={{
                      sellerId,
                      listId: "seller-shop-featured",
                    }}
                  />
                )}
              </section>
            ) : null}

            <form
              method="get"
              action={`${basePath}/sellers/${slug}#shop-items`}
              className="mb-4 ml-auto flex w-full max-w-md items-center gap-2 rounded-[var(--marketplace-search-radius)] border border-marketplace-border bg-marketplace-surface px-3"
            >
              <input type="hidden" name="tab" value="home" />
              {section ? (
                <input type="hidden" name="section" value={section} />
              ) : null}
              {onSale === "1" ? (
                <input type="hidden" name="sale" value="1" />
              ) : null}
              {sort ? <input type="hidden" name="sort" value={sort} /> : null}
              {minPrice ? (
                <input type="hidden" name="min_price" value={minPrice} />
              ) : null}
              {maxPrice ? (
                <input type="hidden" name="max_price" value={maxPrice} />
              ) : null}
              {minRating ? (
                <input type="hidden" name="min_rating" value={minRating} />
              ) : null}
              {personalizable === "1" ? (
                <input type="hidden" name="personalizable" value="1" />
              ) : null}
              <Search
                className="size-4 shrink-0 text-marketplace-muted-foreground"
                aria-hidden
              />
              <label className="sr-only" htmlFor="seller-catalog-search">
                {t("searchThisShop")}
              </label>
              <input
                id="seller-catalog-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder={t("searchPlaceholder")}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-marketplace-foreground outline-none placeholder:text-marketplace-muted-foreground"
              />
              <button
                type="submit"
                className="text-sm font-medium text-marketplace-foreground hover:text-marketplace-brand"
              >
                {t("searchSubmit")}
              </button>
            </form>

            <div className="mb-3 flex flex-col gap-3 border-b border-[#e8e3df] pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#222]">
                  {sectionTitle}
                </h2>
                <p className="mt-1 text-sm text-marketplace-muted-foreground">
                  {t("shopItemCount", { count: products.meta.count })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                {editorPreview && featuredLayout === "none" ? (
                  <div className="flex items-center gap-1">
                    <ShopEditorAction
                      action="featured-layout"
                      label="Change featured layout"
                      className="inline-flex size-8 items-center justify-center rounded-sm text-marketplace-muted-foreground hover:bg-marketplace-surface-subtle hover:text-marketplace-foreground"
                    />
                    <ShopEditorAction
                      action="featured"
                      label="Edit featured listings"
                      className="inline-flex size-8 items-center justify-center rounded-sm text-marketplace-muted-foreground hover:bg-marketplace-surface-subtle hover:text-marketplace-foreground"
                    />
                  </div>
                ) : null}
                <SellerShopProductFilters
                  action={shopProductsPath}
                  section={section}
                  query={query}
                  sort={sort}
                  onSale={onSale}
                />
                <SellerShopSortForm
                  action={shopProductsPath}
                  section={section}
                  query={query}
                  sort={sort}
                  onSale={onSale}
                />
              </div>
            </div>

            <ProductGrid
              products={products.data}
              basePath={basePath}
              listId={query ? "seller-shop-search" : "seller-shop-products"}
              listName={t("allItemsTitle")}
              emptyMessage={t("noProducts")}
              density="rail"
              columns={4}
              mobileColumns={2}
              gap={12}
              sellerShopDiscovery={{
                sellerId,
                listId: query ? "seller-shop-search" : "seller-shop-products",
                section,
              }}
            />

            {pageCount > 1 ? (
              <nav
                className="mt-10 flex items-center justify-center gap-2"
                aria-label={t("productPages")}
              >
                {page > 1 ? (
                  <a
                    href={sellerShopCatalogPath(basePath, slug, {
                      ...catalogLinkParams,
                      page: String(page - 1),
                    })}
                    aria-label={t("previous")}
                    className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </a>
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#c0b9b3]"
                  >
                    <ChevronLeft className="size-4" />
                  </span>
                )}
                {paginationItems.map((pageItem) =>
                  typeof pageItem === "string" ? (
                    <span
                      key={pageItem}
                      aria-hidden="true"
                      className="px-1 text-sm text-[#8a817a]"
                    >
                      …
                    </span>
                  ) : pageItem === page ? (
                    <span
                      key={pageItem}
                      aria-current="page"
                      className="inline-flex size-9 items-center justify-center rounded-full border border-[#39332e] bg-white text-sm font-semibold tabular-nums text-[#39332e]"
                    >
                      {pageItem}
                    </span>
                  ) : (
                    <a
                      key={pageItem}
                      href={sellerShopCatalogPath(basePath, slug, {
                        ...catalogLinkParams,
                        page: String(pageItem),
                      })}
                      aria-label={t("pageOf", {
                        page: pageItem,
                        pages: pageCount,
                      })}
                      className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-sm font-medium tabular-nums text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
                    >
                      {pageItem}
                    </a>
                  ),
                )}
                {page < pageCount ? (
                  <a
                    href={sellerShopCatalogPath(basePath, slug, {
                      ...catalogLinkParams,
                      page: String(page + 1),
                    })}
                    aria-label={t("next")}
                    className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#39332e] transition-colors hover:bg-[#e8e2dc]"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </a>
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 items-center justify-center rounded-full bg-[#f1eeeb] text-[#c0b9b3]"
                  >
                    <ChevronRight className="size-4" />
                  </span>
                )}
              </nav>
            ) : null}

            <SponsoredDiscoveryRailSection
              placement="seller_shop_rail"
              titleKey="sponsoredFromShop"
              titleNamespace="shops"
              basePath={basePath}
              locale={locale}
              sellerId={sellerId}
              limit={8}
              organicProductIds={products.data.map((product) => product.id)}
              className="mt-12"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
