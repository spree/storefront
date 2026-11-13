import type { CmsTheme } from "@spree/sdk";
import Link from "next/link";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";
import { ProductCustomFields } from "@/components/products/ProductCustomFields";
import { ProductListing } from "@/components/products/ProductListing";
import { ProductPageRecommendations } from "@/components/products/ProductPageRecommendations";
import { RecentlyViewedProducts } from "@/components/products/RecentlyViewedProducts";
import { ProductReviewsSection } from "@/components/reviews/ProductReviewsSection";
import { SellerStorefrontHome } from "@/components/shops/seller-storefront/SellerStorefrontHome";
import {
  ThemeAnnouncementSection,
  ThemeFooterSection,
  ThemeHeaderSection,
} from "@/components/theme/chrome/ThemeChromeSections";
import { ProductThemeBody } from "@/components/theme/resource/ProductThemeBody";
import type { SupportedLocale } from "@/i18n/locales";
import { getCategoryProducts } from "@/lib/data/categories";
import { getCollection, getCollectionProducts } from "@/lib/data/collections";
import { getProductFilters } from "@/lib/data/products";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import type {
  ThemeRenderContext,
  ThemeSectionInstance,
} from "@/lib/theme/types";
import { parseListingSearchParams } from "@/lib/utils/listing-search-params";

export async function renderResourceSection(
  section: ThemeSectionInstance,
  context: ThemeRenderContext,
  _theme?: CmsTheme | null,
  productSectionState?: {
    deferToFooterDiscovery?: boolean;
    hasRelated: boolean;
    hasRecommended: boolean;
    hasRecentlyViewed: boolean;
    hasProductReviews?: boolean;
    embeddedProductReview?: {
      settings: Record<string, unknown>;
      visibility?: { mobile?: boolean; tablet?: boolean; desktop?: boolean };
    };
    hasCollectionBanner?: boolean;
    hasCollectionBreadcrumbs?: boolean;
  },
  sidebarBlocks?: React.ReactNode[],
  productBlocks?: React.ReactNode[],
  productMediaSettings?: Record<string, unknown>,
  productBlocksActive = false,
  productMediaBlockId?: string,
  productDescriptionBlockPresent = false,
  productPersonalizationBlockPresent = false,
): Promise<React.ReactNode | null> {
  switch (section.section_type) {
    case "announcement_bar":
      return <ThemeAnnouncementSection section={section} context={context} />;
    case "theme_header":
      return <ThemeHeaderSection section={section} context={context} />;
    case "theme_footer":
      return <ThemeFooterSection section={section} context={context} />;
    case "product_main":
    case "product":
      return context.kind === "product" ? (
        <ProductThemeBody
          context={context}
          sectionSettings={section.settings}
          themeSettings={_theme?.settings || {}}
          productBlocks={productBlocks}
          productMediaSettings={productMediaSettings}
          productMediaBlockId={productMediaBlockId}
          productBlocksActive={productBlocksActive}
          productDescriptionBlockPresent={productDescriptionBlockPresent}
          productPersonalizationBlockPresent={
            productPersonalizationBlockPresent
          }
          documentDriven={section.section_type === "product"}
          productReviewsSectionPresent={Boolean(
            productSectionState?.hasProductReviews,
          )}
          embeddedReviews={
            productSectionState?.embeddedProductReview &&
            themeSettingEnabled(
              _theme?.settings?.product_page?.show_reviews,
              true,
            ) ? (
              <div
                data-theme-section-visibility-mobile={
                  themeSettingEnabled(
                    productSectionState.embeddedProductReview.visibility
                      ?.mobile ??
                      productSectionState.embeddedProductReview.settings
                        .mobileVisible,
                    true,
                  )
                    ? "true"
                    : "false"
                }
                data-theme-section-visibility-tablet={
                  themeSettingEnabled(
                    productSectionState.embeddedProductReview.visibility
                      ?.tablet ??
                      productSectionState.embeddedProductReview.settings
                        .tabletVisible,
                    true,
                  )
                    ? "true"
                    : "false"
                }
                data-theme-section-visibility-desktop={
                  themeSettingEnabled(
                    productSectionState.embeddedProductReview.visibility
                      ?.desktop ??
                      productSectionState.embeddedProductReview.settings
                        .desktopVisible,
                    true,
                  )
                    ? "true"
                    : "false"
                }
              >
                <ProductReviewsSection
                  product={context.product}
                  locale={context.locale}
                  sort={
                    String(
                      productSectionState.embeddedProductReview.settings.sort ||
                        context.reviewSort ||
                        "newest",
                    ) as "newest" | "highest" | "lowest" | "most_helpful"
                  }
                  filters={context.reviewFilters}
                  layout={
                    String(
                      productSectionState.embeddedProductReview.settings
                        .layout || "full",
                    ) as
                      | "summary"
                      | "full"
                      | "carousel"
                      | "gallery"
                      | "highlights"
                      | "attributes"
                  }
                  embedded
                />
              </div>
            ) : undefined
          }
          showTemplateRelated={
            !productSectionState?.hasRelated &&
            !productSectionState?.deferToFooterDiscovery
          }
          showTemplateRecommended={
            !productSectionState?.hasRecommended &&
            !productSectionState?.deferToFooterDiscovery
          }
          showTemplateRecentlyViewed={
            !productSectionState?.hasRecentlyViewed &&
            !productSectionState?.deferToFooterDiscovery
          }
        />
      ) : null;
    case "product_description":
      return context.kind === "product" && context.product.description_html ? (
        <section
          className="container mx-auto px-4 py-8 sm:px-6 lg:px-8"
          data-theme-product-description
        >
          <h2 className="mb-4 text-xl font-semibold">
            {String(section.settings.heading || "Description")}
          </h2>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: context.product.description_html,
            }}
          />
        </section>
      ) : null;
    case "product_details":
      return context.kind === "product" ? (
        <ProductDetailsSection section={section} context={context} />
      ) : null;
    case "product_shipping":
      return context.kind === "product" &&
        (section.settings.details || section.settings.link_url) ? (
        <section
          className="container mx-auto px-4 py-8 sm:px-6 lg:px-8"
          data-theme-product-shipping
        >
          <h2 className="mb-3 text-xl font-semibold">
            {String(section.settings.heading || "Shipping")}
          </h2>
          {typeof section.settings.details === "string" &&
          section.settings.details ? (
            <p className="whitespace-pre-wrap text-sm text-marketplace-muted-foreground">
              {section.settings.details}
            </p>
          ) : null}
          {typeof section.settings.link_url === "string" &&
          section.settings.link_url &&
          typeof section.settings.link_label === "string" &&
          section.settings.link_label ? (
            <Link
              className="mt-3 inline-block text-sm underline"
              href={section.settings.link_url}
            >
              {section.settings.link_label}
            </Link>
          ) : null}
        </section>
      ) : null;
    case "product_reviews":
      return context.kind === "product" &&
        themeSettingEnabled(
          _theme?.settings?.product_page?.show_reviews,
          true,
        ) ? (
        <section data-theme-product-reviews>
          <ProductReviewsSection
            product={context.product}
            locale={context.locale}
            sort={
              String(section.settings.sort || context.reviewSort || "newest") as
                | "newest"
                | "highest"
                | "lowest"
                | "most_helpful"
            }
            filters={context.reviewFilters}
            layout={
              String(section.settings.layout || "full") as
                | "summary"
                | "full"
                | "carousel"
                | "gallery"
                | "highlights"
                | "attributes"
            }
          />
        </section>
      ) : null;
    case "seller_profile":
      return null;
    case "more_from_shop":
      return context.kind === "product" && !context.product.seller ? (
        <ProductPageRecommendations
          productId={context.product.id}
          sellerName={context.product.seller_name}
          basePath={context.basePath}
          currency={context.product.price?.currency ?? context.currency}
          locale={context.locale}
          showRelated
          showRecommended={false}
          relatedHeading={
            typeof section.settings.heading === "string" &&
            section.settings.heading.trim()
              ? section.settings.heading
              : undefined
          }
          productCount={Number(section.settings.product_count) || 8}
        />
      ) : null;
    case "product_recommendations":
      return context.kind === "product" ? (
        <ProductPageRecommendations
          productId={context.product.id}
          sellerName={
            context.product.seller?.name ?? context.product.seller_name
          }
          basePath={context.basePath}
          currency={context.product.price?.currency ?? context.currency}
          locale={context.locale}
          showRecommended
          showRelated={false}
          recommendedHeading={
            typeof section.settings.heading === "string" &&
            section.settings.heading.trim()
              ? section.settings.heading
              : undefined
          }
          productCount={Number(section.settings.product_count) || 8}
        />
      ) : null;
    case "related_products":
      return context.kind === "product" && !context.product.seller ? (
        <ProductPageRecommendations
          productId={context.product.id}
          sellerName={context.product.seller_name}
          basePath={context.basePath}
          currency={context.product.price?.currency ?? context.currency}
          locale={context.locale}
          showRelated
          showRecommended={false}
          productCount={Number(section.settings.product_count) || 8}
          relatedHeading={
            typeof section.settings.heading === "string" &&
            section.settings.heading.trim()
              ? section.settings.heading
              : undefined
          }
        />
      ) : null;
    case "recommended_products":
      return context.kind === "product" ? (
        <ProductPageRecommendations
          productId={context.product.id}
          sellerName={
            context.product.seller?.name ?? context.product.seller_name
          }
          basePath={context.basePath}
          currency={context.product.price?.currency ?? context.currency}
          locale={context.locale}
          showRecommended
          showRelated={false}
          productCount={Number(section.settings.product_count) || 8}
          recommendedHeading={
            typeof section.settings.heading === "string" &&
            section.settings.heading.trim()
              ? section.settings.heading
              : undefined
          }
        />
      ) : null;
    case "recently_viewed_products":
      return context.kind === "product" ? (
        <RecentlyViewedProducts
          productId={context.product.id}
          basePath={context.basePath}
          currency={context.product.price?.currency ?? context.currency}
          heading={
            typeof section.settings.heading === "string" &&
            section.settings.heading.trim()
              ? section.settings.heading
              : undefined
          }
          productCount={Number(section.settings.product_count) || 8}
        />
      ) : null;
    case "page_main":
      return context.kind === "page" ? (
        <CmsPageRenderer
          page={context.page}
          basePath={context.basePath}
          locale={context.locale}
          currency={context.currency}
        />
      ) : null;
    case "seller_main":
      return context.kind === "seller" ? (
        <SellerStorefrontHome
          slug={context.seller.seller.slug}
          basePath={context.basePath}
          locale={context.locale}
          sellerId={context.seller.seller.id}
          sections={context.seller.sections}
          featuredIds={context.seller.featured_product_ids}
          featuredLayout={context.featuredLayout}
          productCount={context.productCount}
          page={context.catalogPage ?? 1}
          section={context.catalogSection}
          query={context.catalogQuery}
          sort={context.catalogSort}
          onSale={context.catalogOnSale}
          minPrice={context.catalogMinPrice}
          maxPrice={context.catalogMaxPrice}
          minRating={context.catalogMinRating}
          personalizable={context.catalogPersonalizable}
          salesCount={context.salesCount ?? undefined}
          followersCount={context.followersCount}
          customOrderHref={context.customOrderHref}
          shopPath={`${context.basePath}/sellers/${context.seller.seller.slug}`}
          shopAnnouncement={context.seller.seller.shop_announcement}
          shopAnnouncementHtml={context.seller.seller.shop_announcement_html}
          policies={context.seller.seller.policies ?? []}
          marketplaceName={context.marketplaceName ?? ""}
          seller={context.seller.seller}
          aboutHtml={context.seller.seller.about_html}
          about={context.seller.seller.about}
          reviewsCount={
            context.reviewsCount ?? context.seller.seller.reviews_count ?? 0
          }
          sellable={context.seller.seller.sellable}
          onVacation={context.seller.seller.on_vacation}
          editorPreview={context.editorPreview}
          shopPage={context.seller.shop_page}
        />
      ) : null;
    case "collection_banner":
      return context.kind === "collection" ? (
        <CollectionBanner section={section} context={context} />
      ) : null;
    case "collection_breadcrumbs":
      return context.kind === "collection" ? (
        <CollectionBreadcrumbs
          showHome={section.settings.show_home !== false}
          context={context}
          custom
        />
      ) : null;
    case "collection_subcollections":
      return context.kind === "collection"
        ? await renderCollectionSubcollections(section, context)
        : null;
    case "category_main":
      return context.kind === "category" ? (
        <ResourceListing
          title={context.categoryName || "Category"}
          listId={`category-${context.categoryId}`}
          listName={`Category: ${context.categoryName || context.categoryId}`}
          context={context}
          categoryId={context.categoryId}
        />
      ) : null;
    case "collection_main":
      return context.kind === "collection" ? (
        <ResourceListing
          title={context.collectionName || "Collection"}
          listId={`collection-${context.collectionId}`}
          listName={`Collection: ${context.collectionName || context.collectionId}`}
          context={context}
          collectionSlug={context.collectionSlug || context.collectionId}
          collection={context.collection}
          showBanner={!productSectionState?.hasCollectionBanner}
          showBreadcrumbs={!productSectionState?.hasCollectionBreadcrumbs}
          productCount={Number(section.settings.product_count) || 12}
          columns={Number(section.settings.columns) || undefined}
          mobileColumns={Number(section.settings.mobile_columns) || undefined}
          filterStyle={
            typeof section.settings.filter_style === "string"
              ? (section.settings.filter_style as
                  | "horizontal"
                  | "left_sidebar"
                  | "right_sidebar"
                  | "left_drawer")
              : "horizontal"
          }
          paginationStyle={
            section.settings.pagination === "pages" ? "pages" : "load_more"
          }
          sidebarBlocks={sidebarBlocks}
        />
      ) : null;
    default:
      return null;
  }
}

function ProductDetailsSection({
  section,
  context,
}: {
  section: ThemeSectionInstance;
  context: Extract<ThemeRenderContext, { kind: "product" }>;
}) {
  const product = context.product;
  const variant = product.default_variant;
  const sku = variant?.sku;
  const options = variant?.options_text;
  if (!sku && !options && !product.custom_fields?.length) return null;
  return (
    <section
      className="container mx-auto px-4 py-6 sm:px-6 lg:px-8"
      data-theme-product-details
    >
      <h2 className="mb-4 text-xl font-semibold">
        {String(section.settings.heading || "Details")}
      </h2>
      {sku || options ? (
        <dl
          className={
            product.custom_fields?.length ? "mb-6 space-y-3" : "space-y-3"
          }
        >
          {sku ? (
            <div className="flex gap-4">
              <dt className="w-32 text-sm text-muted-foreground">SKU</dt>
              <dd className="text-sm">{sku}</dd>
            </div>
          ) : null}
          {options ? (
            <div className="flex gap-4">
              <dt className="w-32 text-sm text-muted-foreground">Options</dt>
              <dd className="text-sm">{options}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <ProductCustomFields customFields={product.custom_fields} />
    </section>
  );
}

async function ResourceListing({
  title,
  listId,
  listName,
  context,
  categoryId,
  collectionSlug,
  collection,
  showBanner = true,
  showBreadcrumbs = true,
  productCount,
  columns,
  mobileColumns,
  filterStyle = "horizontal",
  paginationStyle,
  sidebarBlocks,
}: {
  title: string;
  listId: string;
  listName: string;
  context: Extract<ThemeRenderContext, { kind: "category" | "collection" }>;
  categoryId?: string;
  collectionSlug?: string;
  collection?: Extract<
    ThemeRenderContext,
    { kind: "collection" }
  >["collection"];
  showBanner?: boolean;
  showBreadcrumbs?: boolean;
  productCount?: number;
  columns?: number;
  mobileColumns?: number;
  filterStyle?: "horizontal" | "left_sidebar" | "right_sidebar" | "left_drawer";
  paginationStyle?: "pages" | "load_more";
  sidebarBlocks?: React.ReactNode[];
}) {
  const fetchProducts = categoryId
    ? getCategoryProducts.bind(null, categoryId)
    : getCollectionProducts.bind(null, collectionSlug || "");
  return (
    <>
      {showBreadcrumbs ? (
        <CollectionBreadcrumbs
          showHome
          context={context.kind === "collection" ? context : undefined}
          title={title}
        />
      ) : null}
      {showBanner ? (
        <header
          data-theme-collection-banner
          className="mx-auto w-full max-w-[var(--marketplace-page-width,1440px)] px-4 pb-2 pt-6 sm:px-6 lg:px-8"
        >
          <h1 className="marketplace-listing-title text-balance text-marketplace-foreground">
            {title}
          </h1>
        </header>
      ) : null}
      <div className="mx-auto w-full max-w-[var(--marketplace-page-width,1440px)] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <ProductListing
          state={parseListingSearchParams(context.listingSearchParams ?? {})}
          basePath={context.basePath}
          currency={context.currency}
          locale={context.locale as SupportedLocale}
          listId={listId}
          listName={listName}
          categoryId={categoryId}
          baseParams={categoryId ? { in_category: categoryId } : undefined}
          fetchProducts={fetchProducts}
          fetchFilters={getProductFilters}
          pageSize={productCount}
          columns={columns}
          mobileColumns={mobileColumns}
          filterStyle={filterStyle}
          paginationStyle={paginationStyle}
          sidebarBlocks={sidebarBlocks}
        />
      </div>
    </>
  );
}

function CollectionBreadcrumbs({
  showHome,
  context,
  title,
  custom = false,
}: {
  showHome: boolean;
  context?: Extract<ThemeRenderContext, { kind: "collection" }>;
  title?: string;
  custom?: boolean;
}) {
  const name = title || context?.collectionName || "Collection";
  return (
    <nav
      {...(custom
        ? { "data-theme-collection-breadcrumbs-custom": true }
        : { "data-theme-collection-breadcrumbs": true })}
      aria-label="Breadcrumb"
      className="mx-auto flex w-full max-w-[var(--marketplace-page-width,1440px)] items-center gap-2 px-4 py-3 text-sm text-marketplace-muted-foreground sm:px-6 lg:px-8"
    >
      {showHome ? (
        <>
          <Link
            href={`${context?.basePath || ""}/products`}
            className="hover:underline"
          >
            Shop
          </Link>
          <span aria-hidden="true">/</span>
        </>
      ) : null}
      <span aria-current="page" className="text-marketplace-foreground">
        {name}
      </span>
    </nav>
  );
}

function CollectionBanner({
  section,
  context,
}: {
  section: ThemeSectionInstance;
  context: Extract<ThemeRenderContext, { kind: "collection" }>;
}) {
  const collection = context.collection;
  const imageSetting = section.settings.image_url;
  const image =
    section.settings.style === "image"
      ? (typeof imageSetting === "string" && imageSetting) ||
        collection?.image_url ||
        collection?.mobile_image_url
      : undefined;
  const imageUrl = typeof image === "string" ? image : undefined;
  const height =
    section.settings.style === "compact"
      ? "min-h-32"
      : section.settings.height === "small"
        ? "min-h-48"
        : section.settings.height === "large"
          ? "min-h-[28rem]"
          : "min-h-80";
  const alignment =
    section.settings.alignment === "center"
      ? "text-center items-center"
      : section.settings.alignment === "right"
        ? "text-right items-end"
        : "text-left items-start";
  const customBackground =
    typeof section.settings.background_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(section.settings.background_color)
      ? section.settings.background_color
      : undefined;
  return (
    <section
      data-theme-collection-banner-custom
      className="mx-auto w-full max-w-[var(--marketplace-page-width,1440px)] px-4 sm:px-6 lg:px-8"
    >
      <div
        className={`flex ${height} flex-col justify-end rounded-lg bg-marketplace-surface-warm bg-cover bg-center p-6 md:p-10 ${alignment}`}
        style={{
          ...(imageUrl
            ? {
                backgroundImage: `linear-gradient(0deg, rgb(0 0 0 / 42%), rgb(0 0 0 / 0%)), url("${imageUrl.replace(/["\\]/g, "")}")`,
              }
            : {}),
          ...(customBackground ? { backgroundColor: customBackground } : {}),
        }}
      >
        {section.settings.show_title !== false ? (
          <h1
            className={`max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl ${imageUrl ? "text-white" : "text-marketplace-foreground"}`}
          >
            {collection?.name || context.collectionName || "Collection"}
          </h1>
        ) : null}
        {section.settings.show_description !== false &&
        collection?.short_description ? (
          <p
            className={`mt-3 max-w-2xl ${imageUrl ? "text-white/90" : "text-marketplace-muted-foreground"}`}
          >
            {collection.short_description}
          </p>
        ) : null}
      </div>
    </section>
  );
}

async function renderCollectionSubcollections(
  section: ThemeSectionInstance,
  context: Extract<ThemeRenderContext, { kind: "collection" }>,
): Promise<React.ReactNode> {
  const collectionIds = Array.isArray(section.settings.collection_ids)
    ? section.settings.collection_ids
        .filter((id): id is string => typeof id === "string")
        .slice(0, 24)
    : [];
  const collections = (
    await Promise.all(
      collectionIds.map(async (id) => {
        try {
          return await getCollection(id);
        } catch {
          return null;
        }
      }),
    )
  ).filter(
    (collection): collection is NonNullable<typeof collection> =>
      collection !== null,
  );
  if (!collections.length) return null;
  const columns = Math.min(
    6,
    Math.max(2, Number(section.settings.columns) || 4),
  );
  const ratio =
    section.settings.image_ratio === "portrait"
      ? "aspect-[3/4]"
      : section.settings.image_ratio === "landscape"
        ? "aspect-[4/3]"
        : "aspect-square";
  return (
    <section className="mx-auto w-full max-w-[var(--marketplace-page-width,1440px)] px-4 py-8 sm:px-6 lg:px-8">
      {typeof section.settings.heading === "string" &&
      section.settings.heading ? (
        <h2 className="mb-5 text-xl font-semibold text-marketplace-foreground">
          {section.settings.heading}
        </h2>
      ) : null}
      <ul
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {collections.map((collection) => {
          const image =
            typeof collection.image_url === "string"
              ? collection.image_url
              : typeof collection.square_image_url === "string"
                ? collection.square_image_url
                : "";
          return (
            <li key={collection.id}>
              <Link
                href={`${context.basePath}/collections/${collection.permalink}`}
                className="group block overflow-hidden rounded-lg"
              >
                {image ? (
                  <img
                    src={image}
                    alt=""
                    className={`${ratio} w-full object-cover transition-transform group-hover:scale-[1.02]`}
                  />
                ) : (
                  <div
                    className={`${ratio} w-full bg-marketplace-surface-warm`}
                  />
                )}
                <span className="mt-2 block font-medium text-marketplace-foreground">
                  {collection.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
