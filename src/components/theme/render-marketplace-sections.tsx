import type {
  Category,
  Collection,
  Product,
  ProductListParams,
  Seller,
} from "@spree/sdk";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import { SponsoredDiscoveryRailSection } from "@/components/ads/SponsoredDiscoveryRailSection";
import { type IconName, iconNames, SpreeIcon } from "@/components/icons";
import { FooterContactForm } from "@/components/layout/FooterContactForm";
import { FooterEmailSignup } from "@/components/layout/FooterEmailSignup";
import {
  MarketplacePage,
  MarketplaceRail,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";
import { FeaturedCollectionNavigation } from "@/components/products/FeaturedCollectionNavigation";
import { FeaturedCollectionProductCard } from "@/components/products/FeaturedCollectionProductCard";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ShopCard } from "@/components/shops/ShopCard";
import { CollectionTileCarousel } from "@/components/theme/CollectionTileCarousel";
import { CountdownTimer } from "@/components/theme/CountdownTimer";
import { ImageComparison } from "@/components/theme/ImageComparison";
import { ProductsTabs, type ProductTab } from "@/components/theme/ProductsTabs";
import { SandboxedThemeCode } from "@/components/theme/SandboxedThemeCode";
import { SlideshowSplit } from "@/components/theme/SlideshowSplit";
import { ThemeBlockRenderer } from "@/components/theme/ThemeBlockRenderer";
import { VideoPopup } from "@/components/theme/VideoPopup";
import {
  marketplaceEtsyFilledButtonClass,
  marketplaceEtsyOutlineButtonClass,
} from "@/lib/marketplace-etsy-motion";
import { getClient, getLocaleOptions } from "@/lib/spree";
import { marketplaceFor } from "@/lib/spree/marketplace";
import { sanitizeThemeRichText } from "@/lib/theme/sanitize-rich-text";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import type { ThemeRenderContext } from "@/lib/theme/types";

export type MarketplaceSectionWire = {
  id: string;
  type: string;
  enabled?: boolean;
  disabled?: boolean;
  settings: Record<string, unknown>;
  heroBlocks?: ReactNode;
  blocks?: Record<
    string,
    {
      type: string;
      settings: Record<string, unknown>;
      disabled?: boolean;
      parent_id?: string;
    }
  >;
  blockOrder?: string[];
  visibility?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
};

const marketplaceSectionTypes = new Set([
  "hero",
  "category_tiles",
  "collection_tiles",
  "product_rail",
  "featured_collection",
  "shop_rail",
  "editorial",
  "rich_text",
  "trust",
  "products_rows",
  "featured_product",
  "products_carousel",
  "products_listing",
  "products_tabs",
  "text",
  "slideshow",
  "slideshow_split",
  "video",
  "banners",
  "products_with_banner",
  "shop_the_look",
  "instagram_shop",
  "lookbook_shop",
  "shoppable_videos",
  "collections_list",
  "collection_gradient_overlay",
  "collection_text_below",
  "collection_text_hover",
  "collection_text_overlay",
  "countdown_timer",
  "offer_bar",
  "offer_bar_columns",
  "scrolling_content",
  "testimonials",
  "text_with_icons",
  "brands_list",
  "image",
  "image_carousel",
  "image_comparison",
  "image_gallery",
  "image_masonry",
  "instagram_feed",
  "storytelling",
  "blog_posts",
  "faqs",
  "featured_banner",
  "image_with_text",
  "layered_images_with_text",
  "multicolumn",
  "scrolling_images",
  "video_popup",
  "video_background",
  "grid_banners",
  "hero_banner",
  "masonry_banners",
  "custom_content",
  "custom_content_masonry",
  "custom_liquid",
  "divider",
  "contact_form",
  "map",
  "newsletter",
  "store_locator",
]);

export function isMarketplaceSectionType(type: string): boolean {
  return marketplaceSectionTypes.has(type);
}

function string(settings: Record<string, unknown>, key: string): string {
  return typeof settings[key] === "string" ? (settings[key] as string) : "";
}

function ids(settings: Record<string, unknown>, key: string): string[] {
  return Array.isArray(settings[key])
    ? (settings[key] as unknown[]).filter(
        (id): id is string => typeof id === "string",
      )
    : [];
}

function boundedSetting(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function hexToRgba(color: string, opacity: number): string {
  const safe = safeColor(color, "#000000");
  const alpha = Math.max(0, Math.min(100, opacity)) / 100;
  return `rgba(${Number.parseInt(safe.slice(1, 3), 16)}, ${Number.parseInt(safe.slice(3, 5), 16)}, ${Number.parseInt(safe.slice(5, 7), 16)}, ${alpha})`;
}

function limit(section: MarketplaceSectionWire): number {
  const value = section.settings.limit;
  return typeof value === "number" ? Math.min(24, Math.max(1, value)) : 8;
}

async function listCatalogProducts(
  params?: ProductListParams,
): Promise<Product[]> {
  const options = await getLocaleOptions();
  const expandedParams: ProductListParams = {
    ...params,
    expand: [...new Set([...(params?.expand || []), "seller", "media"])],
  };
  try {
    const response = await getClient().products.list(expandedParams, options);
    return response.data ?? [];
  } catch {
    return [];
  }
}

async function listRecommendationProducts(
  kind: "trending" | "new",
): Promise<Product[]> {
  const options = await getLocaleOptions();
  const marketplace = marketplaceFor(getClient());
  try {
    const response =
      kind === "trending"
        ? await marketplace.recommendations.trending(
            { limit: 24, expand: ["seller", "media"] },
            options,
          )
        : await marketplace.recommendations.new(
            { limit: 24, expand: ["seller", "media"] },
            options,
          );
    return response.data ?? [];
  } catch {
    return [];
  }
}

function safeLink(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("https://")) return href;
  return null;
}

function safeMapEmbedSource(href: string): string | null {
  try {
    const url = new URL(href);
    if (
      url.protocol === "https:" &&
      ((url.hostname === "www.google.com" && url.pathname === "/maps/embed") ||
        (url.hostname === "maps.google.com" &&
          url.pathname === "/maps" &&
          url.searchParams.get("output") === "embed"))
    ) {
      return url.toString();
    }
  } catch {
    /* Only absolute Google Maps embed URLs can be used in an iframe. */
  }
  return null;
}

function safeMediaSource(source: string): string {
  if (source.startsWith("/") && !source.startsWith("//")) return source;
  if (source.startsWith("https://")) return source;
  try {
    const url = new URL(source);
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" ||
        url.hostname.endsWith(".localhost") ||
        /^127(?:\.\d{1,3}){3}$/.test(url.hostname))
    )
      return source;
  } catch {
    /* Invalid media URLs are ignored. */
  }
  return "";
}

function scopedSectionCss(sectionId: string, source: string): string {
  if (
    !source ||
    /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(source)
  )
    return "";
  const scope = sectionId.replace(/[^a-zA-Z0-9_-]/g, "") || "section";
  return source.replace(
    /([^{}]+)\{([^{}]*)\}/g,
    (_rule, selectors: string, declarations: string) => {
      if (selectors.trim().startsWith("@")) return "";
      return `${selectors
        .split(",")
        .map(
          (selector) =>
            `[data-theme-custom-section="${scope}"] ${selector.trim()}`,
        )
        .join(", ")} {${declarations}}`;
    },
  );
}

function withScopedSectionCss(
  section: MarketplaceSectionWire,
  content: React.ReactNode,
): React.ReactNode {
  if (section.type === "hero" || section.type === "featured_collection")
    return content;
  const css = scopedSectionCss(
    section.id,
    string(section.settings, "custom_css"),
  );
  if (!css) return content;
  const scope = section.id.replace(/[^a-zA-Z0-9_-]/g, "") || "section";
  return (
    <div data-theme-custom-section={scope}>
      <style>{css}</style>
      {content}
    </div>
  );
}

function listId(
  context: ThemeRenderContext,
  section: MarketplaceSectionWire,
  suffix: string,
): string {
  const scope =
    context.kind === "home"
      ? "home"
      : context.kind === "product"
        ? `product-${context.product.id}`
        : context.kind;
  return `theme-${scope}-${suffix}-${section.id}`;
}

function renderOrderedSectionBlocks(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
): React.ReactNode[] {
  const renderBlock = (id: string, parentId?: string): React.ReactNode => {
    const block = section.blocks?.[id];
    if (!block || block.disabled || block.parent_id !== parentId) return null;
    const children = (section.blockOrder || [])
      .filter((childId) => section.blocks?.[childId]?.parent_id === id)
      .map((childId) => renderBlock(childId, id));
    return (
      <div key={id} data-theme-block-id={id} data-theme-block-type={block.type}>
        <ThemeBlockRenderer block={block} context={context}>
          {children}
        </ThemeBlockRenderer>
      </div>
    );
  };

  return (section.blockOrder || [])
    .filter((id) => {
      const block = section.blocks?.[id];
      return Boolean(block && !block.disabled && !block.parent_id);
    })
    .map((id) => renderBlock(id));
}

function appendBlocksToSectionContent(
  node: ReactNode,
  sectionId: string,
  blocks: ReactNode[],
): { node: ReactNode; appended: boolean } {
  if (Array.isArray(node)) {
    let appended = false;
    const children = node.map((child) => {
      if (appended) return child;
      const result = appendBlocksToSectionContent(child, sectionId, blocks);
      appended = result.appended;
      return result.node;
    });
    return { node: children, appended };
  }
  if (!isValidElement<{ children?: ReactNode; [key: string]: unknown }>(node))
    return { node, appended: false };

  const props = node.props;
  if (Object.hasOwn(props, "data-theme-section-content")) {
    return {
      node: cloneElement(node, {
        children: (
          <>
            {props.children}
            <div data-theme-section-blocks={sectionId} className="grid gap-4">
              {blocks}
            </div>
          </>
        ),
      }),
      appended: true,
    };
  }

  if (props.children === undefined) return { node, appended: false };
  const result = appendBlocksToSectionContent(
    props.children,
    sectionId,
    blocks,
  );
  return result.appended
    ? { node: cloneElement(node, { children: result.node }), appended: true }
    : { node, appended: false };
}

export async function renderMarketplaceSection(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
): Promise<React.ReactNode> {
  const enabled = section.enabled ?? !section.disabled;
  if (!enabled) return null;
  const renderedSection = await renderMarketplaceSectionContent(
    section,
    context,
  );
  if (
    section.type === "featured_collection" ||
    section.type === "hero" ||
    section.type === "custom_content" ||
    section.type === "custom_content_masonry" ||
    [
      "banners",
      "grid_banners",
      "masonry_banners",
      "collections_list",
      "collection_gradient_overlay",
      "collection_text_below",
      "collection_text_hover",
      "collection_text_overlay",
      "category_tiles",
    ].includes(section.type)
  )
    return withScopedSectionCss(section, renderedSection);
  const orderedBlocks = renderOrderedSectionBlocks(section, context);
  if (orderedBlocks.length === 0)
    return withScopedSectionCss(section, renderedSection);

  const composed = appendBlocksToSectionContent(
    renderedSection,
    section.id,
    orderedBlocks,
  );
  if (composed.appended) return withScopedSectionCss(section, composed.node);

  return withScopedSectionCss(
    section,
    <>
      {renderedSection}
      <div
        data-theme-section-blocks={section.id}
        className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-5 py-4"
      >
        {orderedBlocks}
      </div>
    </>,
  );
}

async function renderMarketplaceSectionContent(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
): Promise<React.ReactNode> {
  const enabled = section.enabled ?? !section.disabled;
  if (!enabled) return null;

  switch (section.type) {
    case "hero":
      return renderHero(section, context);
    case "category_tiles":
      return renderTiles(section, context, "category");
    case "collection_tiles":
      return renderTiles(section, context, "collection");
    case "product_rail":
      return renderProductRail(section, context);
    case "featured_collection":
      return renderFeaturedCollection(section, context);
    case "shop_rail":
      return renderShopRail(section, context);
    case "editorial":
      return renderEditorial(section);
    case "rich_text":
      return renderRichText(section);
    case "trust":
      return renderTrust(section);
    default:
      return renderAvoneSection(section, context);
  }
}

const productSectionTypes = new Set([
  "products_rows",
  "featured_product",
  "products_carousel",
  "products_listing",
  "products_tabs",
  "products_with_banner",
  "shop_the_look",
  "instagram_shop",
  "lookbook_shop",
]);
const collectionSectionTypes = new Set([
  "collections_list",
  "collection_gradient_overlay",
  "collection_text_below",
  "collection_text_hover",
  "collection_text_overlay",
]);

async function renderAvoneSection(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const type = section.type;
  if (type === "products_tabs") return renderProductsTabs(section, context);
  if (productSectionTypes.has(type)) {
    if (type === "shop_the_look") return renderShopTheLook(section, context);
    if (type === "instagram_shop" || type === "lookbook_shop")
      return renderShoppableGallery(section, context);
    const settings = { ...section.settings };
    if (typeof settings.product_count === "number")
      settings.limit = settings.product_count;
    const selectedIds = ids(settings, "product_ids");
    if (typeof settings.product_id === "string" && settings.product_id)
      selectedIds.unshift(settings.product_id);
    if (selectedIds.length) settings.manual_product_ids = selectedIds;
    if (type === "featured_product") {
      settings.source = "manual";
      settings.manual_product_ids = selectedIds.slice(0, 1);
      settings.layout = "grid";
    } else {
      if (type === "products_listing" || type === "products_rows")
        settings.layout = "grid";
      if (type === "products_carousel" || type === "products_tabs")
        settings.layout = "carousel";
    }
    const productRail = await renderProductRail(
      { ...section, settings },
      context,
    );
    if (type !== "products_with_banner") return productRail;
    const banner = await renderEditorial(section);
    return (
      <>
        {banner}
        {productRail}
      </>
    );
  }

  if (collectionSectionTypes.has(type)) {
    const settings = { ...section.settings };
    if (
      type === "collection_gradient_overlay" ||
      type === "collection_text_overlay"
    )
      settings.layout =
        type === "collection_gradient_overlay" ? "gradient" : "overlay";
    else if (type === "collection_text_hover") settings.layout = "hover";
    return renderTiles({ ...section, settings }, context, "collection");
  }

  if (
    [
      "image_carousel",
      "image_gallery",
      "instagram_feed",
      "image_masonry",
      "scrolling_images",
      "image_comparison",
    ].includes(type)
  )
    return renderImageSection(section, context);

  if (type === "image") return renderStandaloneImage(section, context);

  if (type === "shoppable_videos")
    return renderShoppableVideos(section, context);
  if (["video_popup", "video_background"].includes(type))
    return renderVideoSection(section);

  if (type === "countdown_timer") return renderCountdown(section);
  if (type === "text")
    return sectionFrame(
      section,
      <>
        {string(section.settings, "eyebrow") && (
          <p className="text-xs uppercase tracking-widest text-marketplace-brand">
            {string(section.settings, "eyebrow")}
          </p>
        )}
        {string(section.settings, "heading") && (
          <MarketplaceSectionHeader
            title={string(section.settings, "heading")}
          />
        )}
        <p
          data-theme-section-body
          hidden={!string(section.settings, "body")}
          className="whitespace-pre-line text-marketplace-muted-foreground"
        >
          {string(section.settings, "body")}
        </p>
      </>,
      section.settings.alignment === "center"
        ? "text-center"
        : section.settings.alignment === "right"
          ? "text-right"
          : "text-left",
    );
  if (type === "blog_posts") return renderBlogPosts(section, context);
  if (type === "slideshow_split") return renderSplitSlideshow(section);
  if (type === "slideshow")
    return renderImageSection(
      {
        ...section,
        settings: {
          ...section.settings,
          image_urls: ids(section.settings, "slide_image_urls"),
        },
      },
      context,
    );
  if (type === "video") return renderVideoSection(section);
  if (["offer_bar", "offer_bar_columns", "scrolling_content"].includes(type))
    return renderMessageSection(section);
  if (type === "faqs") return renderFaqs(section);
  if (
    [
      "testimonials",
      "text_with_icons",
      "multicolumn",
      "brands_list",
      "blog_posts",
    ].includes(type)
  )
    return section.type === "brands_list"
      ? renderBrandsList(section)
      : renderItemsSection(section);
  if (["contact_form", "newsletter"].includes(type))
    return renderContactSection(section);
  if (type === "map" || type === "store_locator")
    return renderLocationSection(section, context);
  if (type === "divider") return renderDivider(section);
  if (type === "custom_liquid") return renderSafeCodeSection(section, context);
  if (["grid_banners", "masonry_banners", "banners"].includes(type))
    return renderBannerGrid(section, context);
  if (type === "custom_content" || type === "custom_content_masonry")
    return renderCustomContent(section, context);
  if (
    [
      "hero_banner",
      "featured_banner",
      "products_with_banner",
      "image_with_text",
      "storytelling",
      "image",
      "layered_images_with_text",
    ].includes(type)
  )
    return renderEditorial(section);

  if (process.env.NODE_ENV === "development")
    console.warn(`[theme] unknown marketplace section type: ${type}`);
  return null;
}

type ThemeArticleSummary = {
  id: string;
  name: string;
  slug: string;
  seo?: { description?: string | null };
  published_at?: string | null;
};

async function renderBlogPosts(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const selectedIds = ids(section.settings, "page_ids");
  const source = string(section.settings, "source") || "all";
  const requestedLimit = Math.max(
    1,
    Math.min(12, Number(section.settings.limit) || 3),
  );
  const options = await getLocaleOptions();
  const response = await getClient()
    .request<{ data: ThemeArticleSummary[] }>("GET", "/cms/pages", {
      ...options,
      params: {
        page_type: "article",
        limit: source === "manual" ? 50 : requestedLimit,
      },
    })
    .catch(() => ({ data: [] as ThemeArticleSummary[] }));
  const articlesById = new Map(
    response.data.map((article) => [article.id, article]),
  );
  const articles = (
    source === "manual"
      ? selectedIds.flatMap((id) => articlesById.get(id) || [])
      : response.data
  ).slice(0, requestedLimit);

  if (!articles.length) {
    return lines(section.settings.items).length
      ? renderItemsSection(section)
      : null;
  }

  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <article key={article.id} className="min-w-0">
            <Link
              href={`${context.basePath}/pages/${encodeURIComponent(article.slug)}`}
              className="font-semibold text-marketplace-foreground hover:text-marketplace-brand hover:underline"
            >
              {article.name}
            </Link>
            {article.published_at ? (
              <time
                className="mt-2 block text-xs text-marketplace-muted-foreground"
                dateTime={article.published_at}
              >
                {new Intl.DateTimeFormat(context.locale, {
                  dateStyle: "medium",
                }).format(new Date(article.published_at))}
              </time>
            ) : null}
            {article.seo?.description ? (
              <p className="mt-3 line-clamp-3 text-sm text-marketplace-muted-foreground">
                {article.seo.description}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </>,
  );
}

function renderCustomContent(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const settings = section.settings;
  const image = safeMediaSource(string(settings, "image_url"));
  const secondaryImage = safeMediaSource(
    string(settings, "secondary_image_url"),
  );
  const link = safeLink(string(settings, "button_link"));
  const blocks = renderOrderedSectionBlocks(section, context);
  const isMasonry = section.type === "custom_content_masonry";
  const gap = typeof settings.gap === "number" ? settings.gap : 24;
  return sectionFrame(
    section,
    <>
      <div
        className={`grid items-center ${image || secondaryImage ? "md:grid-cols-2" : "grid-cols-1"}`}
        style={{ gap }}
      >
        <div
          className={
            string(settings, "image_position") === "left" ? "md:order-last" : ""
          }
        >
          {string(settings, "eyebrow") ? (
            <p className="text-xs uppercase tracking-widest text-marketplace-brand">
              {string(settings, "eyebrow")}
            </p>
          ) : null}
          {string(settings, "heading") ? (
            <h2
              data-theme-section-heading
              className="mt-3 font-display text-3xl font-semibold text-marketplace-brand"
            >
              {string(settings, "heading")}
            </h2>
          ) : null}
          <p
            data-theme-section-body
            hidden={!string(settings, "body")}
            className="mt-4 whitespace-pre-line text-marketplace-muted-foreground"
          >
            {string(settings, "body")}
          </p>
          {link && string(settings, "button_text") ? (
            <Link
              className="mt-6 inline-block border-b border-marketplace-brand pb-1 text-marketplace-brand"
              href={link}
            >
              {string(settings, "button_text")}
            </Link>
          ) : null}
        </div>
        <div
          data-theme-section-media
          hidden={!image && !secondaryImage}
          className="relative min-h-64"
        >
          <img
            data-theme-section-image
            src={image || undefined}
            alt=""
            hidden={!image}
            className="h-full w-full object-cover"
          />
          <img
            data-theme-section-secondary-image
            src={secondaryImage || undefined}
            alt=""
            hidden={!secondaryImage}
            className={`${image ? "absolute bottom-4 left-4 max-h-1/2 w-1/3 shadow-xl" : "h-full w-full"} object-cover`}
          />
        </div>
      </div>
      {blocks.length > 0 ? (
        <div
          data-theme-section-blocks={section.id}
          className={
            isMasonry
              ? "mt-8 columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid"
              : "mt-8 flex flex-col gap-4"
          }
        >
          {blocks}
        </div>
      ) : null}
    </>,
    string(settings, "alignment") === "center"
      ? "text-center"
      : string(settings, "alignment") === "right"
        ? "text-right"
        : "text-left",
  );
}

async function renderProductsTabs(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const selectedIds = ids(section.settings, "collection_ids");
  if (!selectedIds.length) return null;
  const options = await getLocaleOptions();
  const limitCount = Math.max(
    1,
    Math.min(24, Number(section.settings.product_count) || 8),
  );
  const fetched = await getClient()
    .collections.list(
      { id_in: selectedIds, limit: selectedIds.length },
      options,
    )
    .catch(() => ({ data: [] as Collection[] }));
  const collectionMap = new Map(
    (fetched.data || []).map((collection) => [collection.id, collection]),
  );
  const tabs: ProductTab[] = await Promise.all(
    selectedIds.flatMap((id) => {
      const collection = collectionMap.get(id);
      return collection
        ? [
            getClient()
              .collections.products.list(
                id,
                { limit: limitCount, expand: ["seller", "media"] },
                options,
              )
              .then((response) => ({
                id,
                label: collection.name,
                products: response.data || [],
              }))
              .catch(() => ({ id, label: collection.name, products: [] })),
          ]
        : [];
    }),
  );
  if (!tabs.length) return null;
  const id = listId(context, section, "products-tabs");
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <ProductsTabs
        tabs={tabs}
        basePath={context.basePath}
        currency={context.currency}
        columns={
          typeof section.settings.columns === "number"
            ? section.settings.columns
            : undefined
        }
        gap={
          typeof section.settings.gap === "number"
            ? section.settings.gap
            : undefined
        }
        listId={id}
      />
    </>,
  );
}

function renderSplitSlideshow(section: MarketplaceSectionWire) {
  const images = ids(section.settings, "slide_image_urls")
    .map(safeMediaSource)
    .filter(Boolean);
  const singleImage = safeMediaSource(string(section.settings, "image_url"));
  if (!images.length && singleImage) images.push(singleImage);
  if (!images.length) return null;
  return sectionFrame(
    section,
    <SlideshowSplit
      images={images}
      heading={string(section.settings, "heading")}
      eyebrow={string(section.settings, "eyebrow")}
      body={string(section.settings, "body")}
      href={safeLink(string(section.settings, "button_link")) || undefined}
      buttonText={string(section.settings, "button_text")}
      imagePosition={
        section.settings.image_position === "left" ? "left" : "right"
      }
    />,
  );
}

async function selectedProducts(
  section: MarketplaceSectionWire,
): Promise<Product[]> {
  const selectedIds = ids(section.settings, "product_ids");
  if (!selectedIds.length) return [];
  const fetched = await listCatalogProducts({
    id_in: selectedIds,
    limit: selectedIds.length,
    expand: ["seller", "media"],
  });
  const byId = new Map(fetched.map((product) => [product.id, product]));
  return selectedIds
    .flatMap((id) => byId.get(id) || [])
    .slice(
      0,
      Math.max(1, Math.min(24, Number(section.settings.product_count) || 8)),
    );
}

async function renderShopTheLook(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const products = await selectedProducts(section);
  const image = safeMediaSource(string(section.settings, "image_url"));
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <div
        className="grid items-center lg:grid-cols-2"
        style={{
          gap:
            typeof section.settings.gap === "number"
              ? section.settings.gap
              : 24,
        }}
      >
        {image ? (
          <img
            src={image}
            alt={string(section.settings, "heading")}
            className="max-h-[42rem] w-full rounded-md object-cover"
          />
        ) : (
          <div className="aspect-[4/3] rounded-md bg-marketplace-surface-warm" />
        )}
        {products.length ? (
          <ProductGrid
            products={products}
            basePath={context.basePath}
            currency={context.currency}
            listId={listId(context, section, "shop-the-look")}
            listName={string(section.settings, "heading")}
          />
        ) : (
          <p className="text-marketplace-muted-foreground">
            Choose products for this look.
          </p>
        )}
      </div>
    </>,
  );
}

async function renderShoppableGallery(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const products = await selectedProducts(section);
  const images = ids(section.settings, "image_urls")
    .map(safeMediaSource)
    .filter(Boolean);
  if (!images.length) {
    const primary = safeMediaSource(string(section.settings, "image_url"));
    if (primary) images.push(primary);
  }
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      {images.length ? (
        <div
          className="grid grid-cols-2 md:grid-cols-3"
          style={{
            gap:
              typeof section.settings.gap === "number"
                ? section.settings.gap
                : 12,
          }}
        >
          {images.map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt={`${string(section.settings, "heading") || "Shop the look"} ${index + 1}`}
              className="aspect-[4/5] w-full rounded-md object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
      {products.length ? (
        <div className="mt-6">
          <ProductGrid
            products={products}
            basePath={context.basePath}
            currency={context.currency}
            listId={listId(context, section, "shoppable-gallery")}
            listName={string(section.settings, "heading")}
          />
        </div>
      ) : null}
      {!images.length && !products.length ? (
        <p className="text-marketplace-muted-foreground">
          Choose images or products to feature.
        </p>
      ) : null}
    </>,
  );
}

async function renderShoppableVideos(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const products = await selectedProducts(section);
  const video = renderVideoSection(section);
  return (
    <>
      {video}
      {products.length ? (
        <MarketplaceSection className="pt-0">
          <MarketplacePage>
            <ProductGrid
              products={products}
              basePath={context.basePath}
              currency={context.currency}
              listId={listId(context, section, "shoppable-videos")}
              listName={string(section.settings, "heading")}
            />
          </MarketplacePage>
        </MarketplaceSection>
      ) : null}
    </>
  );
}

function sectionFrame(
  section: MarketplaceSectionWire,
  children: ReactNode,
  className = "",
) {
  const top =
    typeof section.settings.padding_top === "number"
      ? Math.max(0, Math.min(120, section.settings.padding_top))
      : 8;
  const bottom =
    typeof section.settings.padding_bottom === "number"
      ? Math.max(0, Math.min(120, section.settings.padding_bottom))
      : 8;
  const background = string(section.settings, "background_color");
  const text = string(section.settings, "text_color");
  const gap =
    typeof section.settings.gap === "number"
      ? Math.max(0, Math.min(120, section.settings.gap))
      : 24;
  const backgroundColor =
    section.settings.background_enabled === false
      ? undefined
      : /^#[0-9a-fA-F]{6}$/.test(background)
        ? background
        : background === "palette" ||
            section.settings.background_enabled === true
          ? "var(--marketplace-surface-warm)"
          : undefined;
  const color = /^#[0-9a-fA-F]{6}$/.test(text)
    ? text
    : text === "palette"
      ? "var(--marketplace-foreground)"
      : undefined;
  const fullWidth =
    section.settings.width === "full" || section.settings.full_width === true;
  const backgroundImage =
    section.settings.background_enabled === true
      ? safeMediaSource(string(section.settings, "background_image_url"))
      : "";
  return (
    <MarketplaceSection
      data-theme-section-frame={section.id}
      className={`!py-0 ${className}`}
      style={{
        backgroundColor,
        backgroundImage: backgroundImage
          ? `url("${backgroundImage.replaceAll('"', "%22")}")`
          : undefined,
        backgroundSize: backgroundImage ? "cover" : undefined,
        backgroundPosition: backgroundImage ? "center" : undefined,
      }}
    >
      <MarketplacePage
        data-theme-section-content
        className={fullWidth ? "max-w-none" : undefined}
        style={{
          paddingTop: `calc(${top}px * var(--cms-section-spacing-scale, 1))`,
          paddingBottom: `calc(${bottom}px * var(--cms-section-spacing-scale, 1))`,
          color,
          display: "grid",
          gap,
        }}
      >
        {children}
      </MarketplacePage>
    </MarketplaceSection>
  );
}

function renderImageSection(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const settings = section.settings;
  const images = ids(settings, "image_urls")
    .map(safeMediaSource)
    .filter(Boolean);
  const before = safeMediaSource(string(settings, "before_image_url"));
  const after = safeMediaSource(string(settings, "after_image_url"));
  const sources = images.length
    ? images
    : [safeMediaSource(string(settings, "image_url"))].filter(Boolean);
  if (before || after) sources.unshift(...[before, after].filter(Boolean));
  if (section.type === "image_comparison" && before && after)
    return sectionFrame(
      section,
      <>
        <MarketplaceSectionHeader title={string(settings, "heading")} />
        {string(settings, "body") && (
          <p className="mb-5 text-marketplace-muted-foreground">
            {string(settings, "body")}
          </p>
        )}
        <ImageComparison
          before={before}
          after={after}
          heading={string(settings, "heading")}
        />
      </>,
    );
  if (!sources.length) return null;
  const fixedLayoutDefaults: Record<string, string> = {
    image_carousel: "carousel",
    image_masonry: "masonry",
    scrolling_images: "carousel",
    slideshow: "carousel",
  };
  const layout =
    string(settings, "layout") || fixedLayoutDefaults[section.type] || "grid";
  const imageRatios: Record<string, string> = {
    square: "1 / 1",
    portrait: "4 / 5",
    landscape: "3 / 2",
  };
  const imageRatio = imageRatios[string(settings, "image_ratio")];
  const carouselLayout = layout === "carousel";
  const slideshowId =
    section.type === "slideshow"
      ? listId(context, section, "slideshow")
      : undefined;
  if (layout === "masonry")
    return sectionFrame(
      section,
      <>
        <MarketplaceSectionHeader title={string(settings, "heading")} />
        {string(settings, "body") && (
          <p className="mb-5 text-marketplace-muted-foreground">
            {string(settings, "body")}
          </p>
        )}
        <div
          data-theme-image-layout="masonry"
          className="columns-2 md:columns-3 lg:columns-4"
          style={{
            columnGap: typeof settings.gap === "number" ? settings.gap : 12,
          }}
        >
          {sources.map((source, index) => (
            <img
              key={`${source}-${index}`}
              src={source}
              alt={`${string(settings, "heading") || "Store image"} ${index + 1}`}
              className="mb-3 w-full break-inside-avoid rounded-md object-cover"
              style={imageRatio ? { aspectRatio: imageRatio } : undefined}
              loading="lazy"
            />
          ))}
        </div>
      </>,
    );
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(settings, "heading")} />
      {string(settings, "body") && (
        <p className="mb-5 text-marketplace-muted-foreground">
          {string(settings, "body")}
        </p>
      )}
      <div
        id={slideshowId}
        data-theme-image-layout={carouselLayout ? "carousel" : "grid"}
        className={
          carouselLayout
            ? `flex snap-x overflow-x-auto pb-2 ${section.type === "slideshow" ? "scroll-smooth" : ""}`
            : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        }
        style={{
          gap:
            section.type === "slideshow"
              ? 0
              : typeof settings.gap === "number"
                ? settings.gap
                : 12,
        }}
      >
        {sources.map((source, index) => (
          <img
            key={`${source}-${index}`}
            src={source}
            alt={`${string(settings, "heading") || "Store image"} ${index + 1}`}
            className={`min-w-0 rounded-md object-cover ${section.type === "slideshow" ? "w-full shrink-0 snap-start" : carouselLayout ? "w-64 shrink-0 snap-start" : "w-full"}`}
            style={imageRatio ? { aspectRatio: imageRatio } : undefined}
            loading="lazy"
          />
        ))}
      </div>
      {slideshowId ? (
        <FeaturedCollectionNavigation
          listId={slideshowId}
          count={sources.length}
          label="Slideshow"
          itemLabel="slide"
        />
      ) : null}
    </>,
  );
}

function renderStandaloneImage(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const settings = section.settings;
  const image = safeMediaSource(string(settings, "image_url"));
  if (!image) return null;
  const ratio: Record<string, string> = {
    square: "1 / 1",
    portrait: "4 / 5",
    landscape: "3 / 2",
  };
  const imageLink = string(settings, "image_link")
    ? safeLink(string(settings, "image_link"))
    : null;
  const imageElement = (
    <img
      src={image}
      alt={string(settings, "alt") || string(settings, "heading")}
      className={`w-full rounded-md ${ratio[string(settings, "image_ratio")] ? "object-cover" : "h-auto object-contain"}`}
      style={
        ratio[string(settings, "image_ratio")]
          ? { aspectRatio: ratio[string(settings, "image_ratio")] }
          : undefined
      }
      loading="lazy"
    />
  );
  return sectionFrame(
    section,
    <figure>
      {imageLink ? <Link href={imageLink}>{imageElement}</Link> : imageElement}
      {(string(settings, "heading") || string(settings, "body")) && (
        <figcaption className="mt-3 text-sm text-marketplace-muted-foreground">
          {string(settings, "heading") ? (
            <span className="block font-medium text-marketplace-foreground">
              {string(settings, "heading")}
            </span>
          ) : null}
          {string(settings, "body") ? (
            <span className="mt-1 block whitespace-pre-line">
              {string(settings, "body")}
            </span>
          ) : null}
        </figcaption>
      )}
    </figure>,
  );
}

function renderVideoSection(section: MarketplaceSectionWire) {
  const source = safeMediaSource(string(section.settings, "video_url"));
  const poster = safeMediaSource(string(section.settings, "image_url"));
  if (!source) return null;
  if (section.type === "video_popup")
    return sectionFrame(
      section,
      <>
        <MarketplaceSectionHeader title={string(section.settings, "heading")} />
        {string(section.settings, "body") ? (
          <p className="mb-4 text-marketplace-muted-foreground">
            {string(section.settings, "body")}
          </p>
        ) : null}
        <VideoPopup
          src={source}
          poster={poster || undefined}
          title={string(section.settings, "heading")}
        />
        {safeLink(string(section.settings, "button_link")) &&
        string(section.settings, "button_text") ? (
          <Link
            className="mt-4 inline-flex rounded-md bg-marketplace-brand px-4 py-2 text-sm font-medium text-white"
            href={safeLink(string(section.settings, "button_link"))!}
          >
            {string(section.settings, "button_text")}
          </Link>
        ) : null}
      </>,
    );
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <video
        src={source}
        poster={poster || undefined}
        controls={section.type !== "video_background"}
        autoPlay={section.type === "video_background"}
        muted
        loop
        playsInline
        className="max-h-[42rem] w-full rounded-md object-cover"
      />
      {string(section.settings, "body") && (
        <p className="mt-4 text-marketplace-muted-foreground">
          {string(section.settings, "body")}
        </p>
      )}
      {safeLink(string(section.settings, "button_link")) &&
        string(section.settings, "button_text") && (
          <Link
            className="mt-4 inline-flex text-marketplace-brand underline"
            href={safeLink(string(section.settings, "button_link"))!}
          >
            {string(section.settings, "button_text")}
          </Link>
        )}
    </>,
  );
}

function renderCountdown(section: MarketplaceSectionWire) {
  const target = string(section.settings, "end_at");
  return sectionFrame(
    section,
    <div className="text-center">
      {string(section.settings, "eyebrow") && (
        <p className="text-xs uppercase tracking-widest text-marketplace-muted-foreground">
          {string(section.settings, "eyebrow")}
        </p>
      )}
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      {string(section.settings, "body") && (
        <p className="mb-5 text-marketplace-muted-foreground">
          {string(section.settings, "body")}
        </p>
      )}
      {target && (
        <CountdownTimer
          target={target}
          expiredText={
            string(section.settings, "expired_text") || "Offer ended"
          }
        />
      )}
    </div>,
  );
}

function lines(value: unknown): string[] {
  return typeof value === "string"
    ? value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
}

function renderMessageSection(section: MarketplaceSectionWire) {
  const messages = lines(section.settings.messages);
  if (!messages.length && string(section.settings, "body"))
    messages.push(string(section.settings, "body"));
  if (!messages.length) return null;
  const columns = section.type === "offer_bar_columns";
  const scrolling = section.type === "scrolling_content";
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <div
        data-theme-scrolling-content={scrolling ? "true" : undefined}
        className={
          columns
            ? "grid gap-4 text-center sm:grid-cols-2 lg:grid-cols-3"
            : scrolling
              ? "overflow-hidden py-2"
              : "flex snap-x gap-8 overflow-x-auto whitespace-nowrap py-2"
        }
      >
        {scrolling ? (
          <section
            aria-label={messages.join(". ")}
            className="theme-scrolling-content-track flex w-max whitespace-nowrap"
          >
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex shrink-0 gap-8 pr-8"
                aria-hidden={copy === 1 || undefined}
              >
                {messages.map((message, index) => (
                  <p key={`${index}-${message}`} className="shrink-0">
                    {message}
                  </p>
                ))}
              </div>
            ))}
          </section>
        ) : (
          messages.map((message, index) => (
            <p
              key={`${index}-${message}`}
              className={
                columns
                  ? "rounded-md border border-marketplace-border p-4"
                  : "shrink-0"
              }
            >
              {message}
            </p>
          ))
        )}
      </div>
    </>,
    section.type === "offer_bar" ? "bg-marketplace-surface-warm" : "",
  );
}

function renderFaqs(section: MarketplaceSectionWire) {
  const faqs = lines(section.settings.items).map((line) => {
    const [question, ...answer] = line.split("|");
    return { question: question.trim(), answer: answer.join("|").trim() };
  });
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      {faqs.map((faq, index) => (
        <details
          key={`${index}-${faq.question}`}
          className="border-b border-marketplace-border py-4"
        >
          <summary className="cursor-pointer font-medium">
            {faq.question}
          </summary>
          <p className="mt-3 whitespace-pre-line text-marketplace-muted-foreground">
            {faq.answer}
          </p>
        </details>
      ))}
    </>,
  );
}

function renderItemsSection(section: MarketplaceSectionWire) {
  const items = lines(section.settings.items).map((line) => {
    const [title, ...details] = line.split("|");
    return { title: title.trim(), details: details.join("|").trim() };
  });
  if (!items.length && string(section.settings, "body"))
    items.push({
      title: string(section.settings, "heading"),
      details: string(section.settings, "body"),
    });
  if (section.type === "testimonials")
    return renderTestimonials(section, items);
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <div
        className="grid sm:grid-cols-2 lg:grid-cols-3"
        style={{
          gap:
            typeof section.settings.gap === "number"
              ? section.settings.gap
              : 20,
        }}
      >
        {items.map((item, index) => (
          <article
            key={`${index}-${item.title}`}
            className="rounded-lg border border-marketplace-border p-5"
          >
            <h3 className="font-semibold">{item.title}</h3>
            {item.details && (
              <p className="mt-2 whitespace-pre-line text-sm text-marketplace-muted-foreground">
                {item.details}
              </p>
            )}
          </article>
        ))}
      </div>
    </>,
  );
}

function renderTestimonials(
  section: MarketplaceSectionWire,
  items: { title: string; details: string }[],
) {
  const design = string(section.settings, "design") || "design_1";
  const cardClass =
    design === "design_2"
      ? "grid items-start gap-4 border-l-2 border-marketplace-brand px-5 py-4 md:grid-cols-[auto_1fr]"
      : design === "design_3"
        ? "border-t border-marketplace-border py-6 first:border-t-0"
        : "rounded-lg bg-marketplace-surface-warm p-6";
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <div
        data-theme-testimonial-design={design}
        className={
          design === "design_2"
            ? "grid gap-8 md:grid-cols-2"
            : design === "design_3"
              ? "mx-auto max-w-3xl"
              : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {items.map((item, index) => (
          <figure key={`${index}-${item.title}`} className={cardClass}>
            {design === "design_2" ? (
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-full bg-marketplace-surface-warm text-sm font-semibold text-marketplace-brand"
              >
                {item.title.slice(0, 1).toUpperCase()}
              </span>
            ) : design === "design_3" ? (
              <span
                aria-hidden="true"
                className="font-display text-4xl leading-none text-marketplace-brand"
              >
                “
              </span>
            ) : null}
            <blockquote className="text-sm leading-6 text-marketplace-foreground">
              {item.details || item.title}
            </blockquote>
            <figcaption
              className={`mt-3 text-xs font-semibold text-marketplace-muted-foreground ${design === "design_2" ? "md:col-start-2" : ""}`}
            >
              {item.title}
            </figcaption>
          </figure>
        ))}
      </div>
    </>,
  );
}

function renderBrandsList(section: MarketplaceSectionWire) {
  const names = lines(section.settings.items);
  const images = ids(section.settings, "image_urls")
    .map(safeMediaSource)
    .filter((source): source is string => Boolean(source));
  if (images.length === 0 && names.length === 0) return null;
  const count = Math.max(images.length, names.length);
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader title={string(section.settings, "heading")} />
      <div className="grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={`${images[index] || "brand"}-${index}`}
            className="flex min-h-20 flex-col items-center justify-center gap-2 text-center"
          >
            {images[index] ? (
              <div className="relative h-14 w-full max-w-36">
                <Image
                  src={images[index]}
                  alt={names[index]?.split("|")[0] || "Brand"}
                  fill
                  sizes="144px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : null}
            {names[index] ? (
              <span className="text-sm font-medium">
                {names[index].split("|")[0]}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </>,
  );
}

function renderContactSection(section: MarketplaceSectionWire) {
  if (section.type === "newsletter")
    return sectionFrame(
      section,
      <div className="mx-auto max-w-2xl">
        <FooterEmailSignup
          title={
            string(section.settings, "heading") || "Subscribe to our emails"
          }
          description={string(section.settings, "body")}
          buttonLabel={string(section.settings, "button_text") || "Subscribe"}
          successText={
            string(section.settings, "success_text") ||
            "Thanks for subscribing!"
          }
        />
      </div>,
    );
  return sectionFrame(
    section,
    <div className="mx-auto max-w-xl">
      <FooterContactForm
        title={string(section.settings, "heading") || "Contact us"}
        description={string(section.settings, "body")}
        recipientEmail={string(section.settings, "recipient_email")}
        submitLabel={string(section.settings, "button_text") || "Send message"}
      />
    </div>,
  );
}

function renderLocationSection(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const mapUrl = string(section.settings, "map_url");
  const href = safeLink(mapUrl);
  const embedUrl = section.type === "map" ? safeMapEmbedSource(mapUrl) : null;
  return sectionFrame(
    section,
    <>
      <MarketplaceSectionHeader
        title={
          string(section.settings, "heading") ||
          (section.type === "map" ? "Find us" : "Our locations")
        }
      />
      {string(section.settings, "address") && (
        <p className="mb-4 whitespace-pre-line text-marketplace-muted-foreground">
          {string(section.settings, "address")}
        </p>
      )}
      {embedUrl && (
        <iframe
          title={`${string(section.settings, "heading") || "Map"}${string(section.settings, "address") ? `: ${string(section.settings, "address")}` : ""}`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          allowFullScreen
          className="mt-4 aspect-video w-full rounded-md border-0"
        />
      )}
      {href && (
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-marketplace-brand underline"
        >
          Open map
        </Link>
      )}
    </>,
  );
}

function renderDivider(section: MarketplaceSectionWire) {
  const thickness =
    typeof section.settings.thickness === "number"
      ? Math.max(0, Math.min(8, section.settings.thickness))
      : 1;
  const configuredColor = string(section.settings, "color");
  const color = /^#[0-9a-fA-F]{6}$/.test(configuredColor)
    ? configuredColor
    : configuredColor === "palette"
      ? "var(--marketplace-border)"
      : "currentColor";
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full"
      style={{
        width:
          section.settings.width === "full" ||
          section.settings.section_width === "full"
            ? "100%"
            : "min(100% - 2rem, var(--marketplace-page-width, 1200px))",
        borderTop: `${thickness}px solid ${color}`,
        marginBlock: `${typeof section.settings.padding_top === "number" ? section.settings.padding_top : 24}px ${typeof section.settings.padding_bottom === "number" ? section.settings.padding_bottom : 24}px`,
      }}
    />
  );
}

function renderBannerGrid(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const blockNodes = renderOrderedSectionBlocks(section, context);
  const images = ids(section.settings, "image_urls")
    .map(safeMediaSource)
    .filter(Boolean);
  for (const source of [
    string(section.settings, "image_url"),
    string(section.settings, "secondary_image_url"),
  ]) {
    const safeSource = safeMediaSource(source);
    if (safeSource && !images.includes(safeSource)) images.push(safeSource);
  }
  if (!images.length && blockNodes.length === 0) return null;
  const linkValue = string(section.settings, "button_link");
  const link = linkValue ? safeLink(linkValue) : null;
  const masonry = section.type === "masonry_banners";
  const alignment = string(section.settings, "alignment");
  const alignmentClass =
    alignment === "center"
      ? "text-center"
      : alignment === "right"
        ? "text-right"
        : "text-left";
  const labelPosition =
    string(section.settings, "image_position") === "right"
      ? "right-4"
      : "left-4";
  return sectionFrame(
    section,
    <>
      {string(section.settings, "eyebrow") ? (
        <p
          className={`text-xs uppercase tracking-widest text-marketplace-brand ${alignmentClass}`}
        >
          {string(section.settings, "eyebrow")}
        </p>
      ) : null}
      <div className={alignmentClass}>
        <MarketplaceSectionHeader title={string(section.settings, "heading")} />
        {string(section.settings, "body") ? (
          <p className="mt-3 text-marketplace-muted-foreground">
            {string(section.settings, "body")}
          </p>
        ) : null}
      </div>
      <div
        className={
          masonry
            ? "columns-1 md:columns-2"
            : section.type === "grid_banners"
              ? "grid grid-cols-2 lg:grid-cols-3"
              : "grid grid-cols-1 md:grid-cols-2"
        }
        data-theme-section-content
        style={{
          gap:
            typeof section.settings.gap === "number"
              ? section.settings.gap
              : 16,
        }}
      >
        {blockNodes.length > 0
          ? blockNodes.map((block, index) => (
              <div
                key={`banner-block-${index}`}
                className={masonry ? "mb-4 break-inside-avoid" : "min-w-0"}
              >
                {block}
              </div>
            ))
          : images.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className={`relative mb-4 overflow-hidden rounded-md bg-marketplace-surface-warm ${masonry ? "break-inside-avoid" : ""}`}
              >
                {link ? (
                  <Link href={link} className="block">
                    <img
                      src={src}
                      alt={
                        string(section.settings, "heading") ||
                        `Banner ${index + 1}`
                      }
                      className="max-h-[36rem] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </Link>
                ) : (
                  <img
                    src={src}
                    alt={
                      string(section.settings, "heading") ||
                      `Banner ${index + 1}`
                    }
                    className="max-h-[36rem] w-full object-cover"
                    loading="lazy"
                  />
                )}
                {string(section.settings, "button_text") && link ? (
                  <Link
                    href={link}
                    className={`absolute bottom-4 ${labelPosition} rounded bg-white/90 px-3 py-2 text-sm font-medium`}
                  >
                    {string(section.settings, "button_text")}
                  </Link>
                ) : string(section.settings, "button_text") ? (
                  <span
                    className={`absolute bottom-4 ${labelPosition} rounded bg-white/90 px-3 py-2 text-sm font-medium`}
                  >
                    {string(section.settings, "button_text")}
                  </span>
                ) : null}
              </div>
            ))}
      </div>
    </>,
  );
}

function renderSafeCodeSection(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const code = string(section.settings, "code");
  return code
    ? sectionFrame(
        section,
        <SandboxedThemeCode
          code={code}
          context={context}
          title="Custom Liquid section"
        />,
      )
    : null;
}

async function renderHero(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const settings = section.settings;
  const image = safeMediaSource(
    string(settings, "media_1_image_url") || string(settings, "image_url"),
  );
  const secondImage = safeMediaSource(string(settings, "media_2_image_url"));
  const video1 = safeMediaSource(
    string(settings, "media_1_video_url") || string(settings, "video_source"),
  );
  const video2 = safeMediaSource(string(settings, "media_2_video_url"));
  const variant = string(settings, "hero_variant");
  const slides = Array.isArray(settings.slide_image_urls)
    ? settings.slide_image_urls
        .map((url) => (typeof url === "string" ? safeMediaSource(url) : ""))
        .filter(Boolean)
    : [];
  const link = safeLink(string(settings, "button_link"));
  const layout = string(settings, "layout");
  const sectionLink = safeLink(string(settings, "section_link"));
  const newTab = themeSettingEnabled(settings.open_link_in_new_tab);
  const direction = string(settings, "direction") || "horizontal";
  const alignment =
    string(settings, "alignment") ||
    (layout === "centered" ? "center" : "left");
  const position = string(settings, "position") || "middle";
  const gap =
    typeof settings.gap === "number"
      ? Math.max(0, Math.min(120, settings.gap))
      : 24;
  const width = string(settings, "section_width");
  const height = string(settings, "height");
  const paddingTop =
    typeof settings.padding_top === "number" ? settings.padding_top : 100;
  const paddingBottom =
    typeof settings.padding_bottom === "number" ? settings.padding_bottom : 72;
  const paletteSchemes: Record<string, { background: string; text: string }> = {
    "scheme-1": { background: "#ffffff", text: "#111111" },
    "scheme-2": { background: "#f6f1e8", text: "#6c315d" },
    "scheme-3": { background: "#e8f4ef", text: "#173b32" },
    "scheme-4": { background: "#f0f3fa", text: "#24365f" },
    "scheme-5": { background: "#fff5e8", text: "#804a19" },
  };
  const palette =
    paletteSchemes[string(settings, "theme_color_scheme")] ||
    paletteSchemes["scheme-1"];
  const backgroundColor = /^#[0-9a-fA-F]{6}$/.test(
    string(settings, "background_color"),
  )
    ? string(settings, "background_color")
    : palette.background;
  const themeTextColor = /^#[0-9a-fA-F]{6}$/.test(
    string(settings, "theme_text_color"),
  )
    ? string(settings, "theme_text_color")
    : palette.text;
  const rawCustomCss = string(settings, "custom_css");
  const customCss =
    /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(rawCustomCss)
      ? ""
      : rawCustomCss.replace(
          /([^{}]+)\{([^{}]*)\}/g,
          (_rule, selectors: string, declarations: string) => {
            if (selectors.trim().startsWith("@")) return "";
            return `${selectors
              .split(",")
              .map(
                (selector) =>
                  `[data-theme-hero-section="${section.id}"] ${selector.trim()}`,
              )
              .join(", ")} {${declarations}}`;
          },
        );
  const overlayColor = /^#[0-9a-fA-F]{6}$/.test(
    string(settings, "overlay_color"),
  )
    ? string(settings, "overlay_color")
    : "#121212";
  const overlayStyle = string(settings, "overlay_style");
  const overlay = themeSettingEnabled(settings.media_overlay);
  const blurred = themeSettingEnabled(settings.blur_media);
  const heightClass =
    height === "small"
      ? "h-full min-h-64"
      : height === "large"
        ? "h-full min-h-[44rem]"
        : "h-full min-h-[32rem]";
  const contentBlocks = section.heroBlocks;
  const hasValue = (value: unknown) =>
    typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  const hasConfiguredBlockContent = (section.blockOrder || []).some((id) => {
    const block = section.blocks?.[id];
    if (!block || block.disabled || block.parent_id) return false;
    if (block.type === "heading" || block.type === "text")
      return hasValue(block.settings.text);
    if (block.type === "button") return hasValue(block.settings.label);
    if (block.type === "image")
      return (
        hasValue(block.settings.image_url) || hasValue(block.settings.image_id)
      );
    return false;
  });
  const hasConfiguredLegacyContent = Boolean(
    string(settings, "eyebrow").trim() ||
      string(settings, "heading").trim() ||
      string(settings, "subheading").trim() ||
      (link && string(settings, "button_text").trim()),
  );
  const hasContent = contentBlocks
    ? hasConfiguredBlockContent
    : hasConfiguredLegacyContent;
  const content = contentBlocks ? (
    <div className="space-y-3">{contentBlocks}</div>
  ) : (
    <>
      {string(settings, "eyebrow") && (
        <p className="text-xs uppercase tracking-widest text-marketplace-brand">
          {string(settings, "eyebrow")}
        </p>
      )}
      {string(settings, "heading") && (
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-marketplace-brand md:text-6xl">
          {string(settings, "heading")}
        </h1>
      )}
      {string(settings, "subheading") && (
        <p className="mt-5 max-w-xl text-marketplace-muted-foreground">
          {string(settings, "subheading")}
        </p>
      )}
      {link && string(settings, "button_text") && (
        <Link
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener noreferrer" : undefined}
          className="mt-8 w-fit border-b border-marketplace-brand pb-1 text-marketplace-brand"
          href={link}
        >
          {string(settings, "button_text")}
        </Link>
      )}
    </>
  );

  function renderMedia(source: string, type: string, key: string) {
    const mobileMediaClass = themeSettingEnabled(
      settings.show_different_media_mobile,
    )
      ? key === "media-1"
        ? "hidden sm:block"
        : "sm:hidden"
      : "";
    const mediaClass = `h-full w-full object-cover ${blurred ? "scale-105 blur-sm" : ""}`;
    const media = source ? (
      type === "video" ? (
        <video
          src={source}
          poster={image || undefined}
          className={mediaClass}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <img src={source} alt="" className={mediaClass} />
      )
    ) : null;
    return (
      <div
        key={key}
        data-theme-hero-media={key === "media-1" ? "1" : "2"}
        className={`relative flex items-center justify-center overflow-hidden ${heightClass} ${mobileMediaClass}`}
        style={{ display: source ? undefined : "none" }}
      >
        {media}
        {overlay && (
          <div
            data-theme-hero-overlay="true"
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                overlayStyle === "gradient"
                  ? `linear-gradient(90deg, ${overlayColor}cc, ${overlayColor}22)`
                  : `${overlayColor}66`,
            }}
          />
        )}
      </div>
    );
  }

  const media1Type =
    string(settings, "media_1_type") ||
    (variant === "video" ? "video" : "image");
  const media2Type = string(settings, "media_2_type") || "image";
  const media1 = renderMedia(
    media1Type === "video" ? video1 : image,
    media1Type,
    "media-1",
  );
  const media2 = renderMedia(
    media2Type === "video" ? video2 : secondImage,
    media2Type,
    "media-2",
  );
  const mobileDifferent = themeSettingEnabled(
    settings.show_different_media_mobile,
  );
  const stackMobile = themeSettingEnabled(settings.stack_media_mobile, true);
  const mediaItems = (
    <>
      {media1}
      {media2}
    </>
  );

  const mobileMediaCount = mobileDifferent
    ? Number(Boolean(secondImage || video2))
    : Number(Boolean(image || video1)) + Number(Boolean(secondImage || video2));
  const desktopMediaCount = mobileDifferent
    ? Number(Boolean(image || video1))
    : mobileMediaCount;
  const mediaList = (
    <div
      data-theme-hero-media-list="true"
      className={`grid h-full ${direction === "horizontal" ? "gap-0" : "gap-3"} ${stackMobile || mobileMediaCount < 2 ? "grid-cols-1" : "grid-cols-2"} ${direction === "horizontal" && desktopMediaCount > 1 ? "md:grid-cols-2" : "md:grid-cols-1"} ${layout === "image_left" ? "md:order-first" : ""}`}
    >
      {variant === "slider" && slides.length > 0
        ? slides.map((url, index) => (
            <div
              key={`${url}-${index}`}
              data-theme-hero-media={
                index < 2 ? String(index + 1) : `slide-${index + 1}`
              }
              className={`relative flex h-full min-h-[28rem] w-full snap-start items-center justify-center overflow-hidden ${heightClass}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </div>
          ))
        : mediaItems}
    </div>
  );
  const textAlign =
    alignment === "center"
      ? "text-center items-center"
      : alignment === "right"
        ? "text-right items-end"
        : "text-left items-start";
  const contentPosition =
    position === "top"
      ? "justify-start"
      : position === "bottom"
        ? "justify-end"
        : "justify-center";
  const heroStyle = {
    backgroundColor,
    paddingTop,
    paddingBottom,
    gap,
    ...(themeSettingEnabled(settings.text_baseline)
      ? { alignItems: "baseline" as const }
      : {}),
  };
  const contentMinHeight =
    height === "small" ? "16rem" : height === "large" ? "44rem" : "32rem";
  const heroContent = hasContent ? (
    <div
      data-theme-hero-content="true"
      className={`relative z-20 flex flex-col ${textAlign} ${contentPosition} px-6 py-8 md:px-12`}
      style={{ gap, minHeight: contentMinHeight }}
    >
      <div className="w-full" style={{ color: themeTextColor }}>
        {content}
      </div>
    </div>
  ) : null;
  const hasMedia = Boolean(image || secondImage || video1 || video2);
  if (variant === "split" && image && secondImage) {
    const plain = (value: unknown) =>
      String(value ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const blocks = Object.values(section.blocks || {});
    const headingBlock = blocks.find((block) => block.type === "heading");
    const buttonBlock = blocks.find((block) => block.type === "button");
    const headline =
      plain(headingBlock?.settings.text) ||
      plain(settings.heading) ||
      "Meet the Etsy Design Awards Finalists";
    const buttonLabel =
      plain(buttonBlock?.settings.label) ||
      string(settings, "button_text").trim() ||
      "Get inspired";
    const buttonHref =
      safeLink(string(buttonBlock?.settings || {}, "link")) ||
      safeLink(string(settings, "button_link")) ||
      `${context.basePath}/products`;
    const promoTitle =
      string(settings, "subheading").trim() ||
      "Trick-or-treat bags with personality";
    const promoHref =
      safeLink(string(settings, "promo_link")) ||
      `${context.basePath}/products`;
    const splitBackgroundColor = /^#[0-9a-fA-F]{6}$/.test(
      string(settings, "split_background_color"),
    )
      ? string(settings, "split_background_color")
      : "#ffad00";
    return (
      <div data-theme-hero-section={section.id} data-theme-hero-variant="split">
        <MarketplaceSection surface="none" className="py-0">
          <div
            data-theme-hero-split="true"
            data-theme-hero-height={
              settings.height === "small" || settings.height === "large"
                ? String(settings.height)
                : undefined
            }
            className="theme-hero-split mx-auto w-full max-w-[var(--marketplace-container,1440px)] px-4 py-3 sm:px-6 sm:py-4 lg:px-8"
          >
            <div className="theme-hero-split-grid grid min-h-[14rem] grid-cols-1 md:min-h-[17rem] md:grid-cols-[minmax(0,1.6fr)_minmax(140px,0.65fr)_minmax(180px,1fr)]">
              <div
                data-theme-hero-frame="true"
                data-theme-hero-variant="split"
                data-theme-hero-align={
                  settings.alignment === "left" ||
                  settings.alignment === "right"
                    ? String(settings.alignment)
                    : undefined
                }
                data-theme-hero-position={
                  settings.position === "top" || settings.position === "bottom"
                    ? String(settings.position)
                    : undefined
                }
                className="theme-hero-split-copy flex flex-col items-center justify-center rounded-l-xl rounded-r-none px-6 py-8 text-center md:px-8"
                style={{
                  backgroundColor: splitBackgroundColor,
                  paddingTop: Number.isFinite(Number(settings.padding_top))
                    ? `${Math.max(0, Math.min(120, Number(settings.padding_top)))}px`
                    : undefined,
                  paddingBottom: Number.isFinite(
                    Number(settings.padding_bottom),
                  )
                    ? `${Math.max(0, Math.min(120, Number(settings.padding_bottom)))}px`
                    : undefined,
                  gap: Number.isFinite(Number(settings.gap))
                    ? `${Math.max(0, Math.min(120, Number(settings.gap)))}px`
                    : undefined,
                }}
              >
                <h1
                  data-theme-hero-headline
                  className="max-w-[14ch] font-display text-[clamp(1.75rem,1.35rem+1.6vw,2.75rem)] font-semibold leading-[1.05] tracking-tight text-marketplace-foreground"
                >
                  {headline}
                </h1>
                <Link
                  data-theme-hero-cta
                  href={buttonHref}
                  className={`theme-hero-split-cta-desktop ${Number.isFinite(Number(settings.gap)) ? "" : "mt-5"} ${marketplaceEtsyFilledButtonClass}`}
                >
                  {buttonLabel}
                </Link>
              </div>
              <div
                data-theme-hero-media="1"
                className="theme-hero-split-photo relative min-h-[17rem] rounded-none md:min-h-[22rem]"
              >
                <img
                  src={image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="theme-hero-split-cta-mobile">
                  <Link
                    data-theme-hero-cta
                    href={buttonHref}
                    className={marketplaceEtsyFilledButtonClass}
                  >
                    {buttonLabel}
                  </Link>
                </div>
              </div>
              <Link
                href={promoHref}
                data-theme-hero-media="2"
                data-theme-hero-promo-default-href={`${context.basePath}/products`}
                className="theme-hero-split-promo relative ml-0 min-h-[17rem] rounded-xl md:ml-8 md:min-h-[22rem]"
              >
                <img
                  src={secondImage}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-16 text-white">
                  <span
                    data-theme-hero-promo
                    className="block text-xl font-semibold leading-tight"
                  >
                    {promoTitle}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium">
                    Shop now
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </MarketplaceSection>
      </div>
    );
  }
  const frame = (
    <div
      data-theme-hero-frame="true"
      data-theme-hero-variant={variant || "classic"}
      className={`relative grid items-stretch ${direction === "horizontal" && hasMedia && hasContent ? "md:grid-cols-2" : "grid-cols-1"} ${layout === "image_left" && hasContent ? "md:[&>*:first-child]:order-2" : ""}`}
      style={heroStyle}
    >
      {sectionLink && (
        <Link
          data-theme-hero-link="true"
          aria-label="Open hero link"
          href={sectionLink}
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener noreferrer" : undefined}
          className="absolute inset-0 z-10"
        />
      )}
      {heroContent}
      <div
        data-theme-hero-media-area="true"
        className="relative z-0 h-full self-stretch"
        style={{ display: hasMedia ? undefined : "none" }}
      >
        {mediaList}
      </div>
    </div>
  );
  return (
    <div
      data-theme-hero-section={section.id}
      data-theme-hero-variant={variant || "classic"}
    >
      <MarketplaceSection
        surface={backgroundColor ? "none" : "warm"}
        className="py-0"
      >
        <div
          className={
            width === "full"
              ? "w-full"
              : "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8"
          }
        >
          {frame}
        </div>
        {customCss && <style>{customCss}</style>}
      </MarketplaceSection>
    </div>
  );
}

type RenderedTile = {
  id: string;
  name: string;
  description?: string;
  buttonLabel?: string;
  count?: number;
  href: string;
  image?: string | null;
};

function renderCollectionTile(
  item: RenderedTile,
  settings: Record<string, unknown>,
  layout: string,
  kind: "category" | "collection",
) {
  const overlay =
    layout === "gradient" || layout === "overlay" || layout === "hover";
  const overlayColor = safeColor(
    string(
      settings,
      layout === "hover" ? "hover_background_color" : "image_overlay",
    ),
    "#000000",
  );
  const opacity = boundedSetting(settings.overlay_opacity, 55, 0, 100);
  const textColor = safeColor(
    string(settings, "title_color"),
    overlay ? "#ffffff" : "#222222",
  );
  const radius =
    layout === "circles"
      ? 9999
      : boundedSetting(settings.corner_radius, 0, 0, 120);
  const ratio = string(settings, "image_ratio") || "adapt";
  const aspectRatio =
    layout === "circles"
      ? "1 / 1"
      : ratio === "square"
        ? "1 / 1"
        : ratio === "portrait"
          ? "3 / 4"
          : ratio === "landscape"
            ? "4 / 3"
            : undefined;
  const position = string(settings, "text_position") || "bottom";
  const hoverOnly = layout === "hover";
  const bgEnabled = settings.card_background_enabled === true;
  const cardStyle = bgEnabled
    ? {
        backgroundColor: safeColor(
          string(settings, "card_background_color"),
          "#ffffff",
        ),
        borderRadius: `${boundedSetting(settings.card_corner_radius, 0, 0, 120)}px`,
        padding: `${boundedSetting(settings.card_padding, 0, 0, 120)}px`,
      }
    : undefined;
  const gradient =
    string(settings, "overlay_direction") === "top"
      ? `linear-gradient(to bottom, ${hexToRgba(overlayColor, opacity)}, transparent 75%)`
      : string(settings, "overlay_direction") === "full"
        ? hexToRgba(overlayColor, opacity * 0.62)
        : `linear-gradient(to top, ${hexToRgba(overlayColor, opacity)}, transparent 78%)`;
  const titlePreset = string(settings, "title_preset") || "heading_6";
  const presetIndex = /^heading_[1-6]$/.test(titlePreset)
    ? titlePreset.slice(-1)
    : "6";
  const titleSize =
    titlePreset === "custom_hd"
      ? `${boundedSetting(settings.title_size, 18, 8, 200)}px`
      : `var(--marketplace-heading${presetIndex}-size, 1rem)`;
  const titleStyle: CSSProperties = {
    color: textColor,
    fontSize: titleSize,
    fontWeight:
      titlePreset === "custom_hd"
        ? Number(settings.title_weight) || 600
        : `var(--marketplace-heading${presetIndex}-weight, 600)`,
    fontFamily:
      settings.title_font === "heading"
        ? "var(--marketplace-heading-font, inherit)"
        : settings.title_font === "body"
          ? "var(--marketplace-body-font, inherit)"
          : undefined,
  };
  const contentClass = `absolute inset-0 z-[1] flex flex-col ${position === "top" ? "justify-start" : position === "center" ? "justify-center" : "justify-end"} ${hoverOnly ? "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" : ""}`;
  const buttonClass =
    string(settings, "button_style") === "primary"
      ? marketplaceEtsyFilledButtonClass
      : string(settings, "button_style") === "secondary"
        ? marketplaceEtsyOutlineButtonClass
        : "inline-flex w-fit items-center justify-center rounded-full border border-current px-3 py-1 text-xs font-semibold";
  const buttonSize = string(settings, "button_size") || "small";
  const fallbackPalette = [
    { background: "#e7eee8", foreground: "#315244" },
    { background: "#f2e8df", foreground: "#754d37" },
    { background: "#e7edf2", foreground: "#3c586d" },
    { background: "#f1ead4", foreground: "#705c22" },
    { background: "#efe5e8", foreground: "#704b5a" },
  ];
  const paletteIndex =
    Array.from(item.name).reduce(
      (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
      0,
    ) % fallbackPalette.length;
  const fallbackColors = fallbackPalette[paletteIndex];
  const initials = item.name
    .replace(/^\[[^\]]+\]\s*/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <Link
      key={item.id}
      href={item.href}
      className={`group block min-w-0 ${settings.animated_hover_border === true ? "collection-tile-animated-border" : ""}`}
      style={cardStyle}
    >
      <div
        className="relative isolate overflow-hidden bg-marketplace-surface-warm"
        style={{
          aspectRatio: aspectRatio || (!item.image ? "4 / 3" : undefined),
          borderRadius: `${radius}px`,
          border:
            settings.image_border === true
              ? "1px solid var(--marketplace-border, #dedbd6)"
              : undefined,
        }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className={`${aspectRatio ? "absolute inset-0 h-full w-full object-cover" : "relative h-auto w-full object-contain"} transition-transform duration-300 ${settings.image_zoom_on_hover === true ? "group-hover:scale-105" : ""}`}
          />
        ) : (
          <div
            aria-hidden="true"
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            style={{ backgroundColor: fallbackColors.background }}
          >
            <span
              className="select-none font-serif text-6xl font-semibold leading-none"
              style={{ color: fallbackColors.foreground, opacity: 0.78 }}
            >
              {initials || (kind === "category" ? "C" : "S")}
            </span>
          </div>
        )}
        {overlay && (
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${hoverOnly ? "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" : ""}`}
            style={{
              background:
                layout === "overlay"
                  ? hexToRgba(overlayColor, opacity)
                  : gradient,
            }}
          />
        )}
        {overlay && (
          <div
            className={contentClass}
            style={{
              padding: `${boundedSetting(settings.text_padding_y, 15, 0, 120)}px ${boundedSetting(settings.text_padding_x, 30, 0, 120)}px ${position === "bottom" && layout === "overlay" ? boundedSetting(settings.text_bottom_margin, 20, 0, 120) : boundedSetting(settings.text_padding_y, 15, 0, 120)}px`,
              borderRadius: `${boundedSetting(settings.text_corner_radius, 0, 0, 120)}px`,
            }}
          >
            <h3
              data-collection-tile-title
              className="font-semibold leading-tight drop-shadow"
              style={titleStyle}
            >
              {item.name}
            </h3>
            {settings.show_product_count === true &&
              typeof item.count === "number" && (
                <span className="mt-1 text-xs" style={titleStyle}>
                  {item.count} {kind === "category" ? "categories" : "products"}
                </span>
              )}
            {item.description && (
              <p className="mt-1 text-sm leading-snug" style={titleStyle}>
                {item.description}
              </p>
            )}
            {item.buttonLabel && (
              <span
                className={`${buttonClass} mt-2 ${buttonSize === "large" ? "px-5 py-2.5 text-sm" : buttonSize === "medium" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs"}`}
                style={titleStyle}
              >
                {item.buttonLabel}
              </span>
            )}
          </div>
        )}
      </div>
      {!overlay && (
        <div
          className="grid gap-1 pt-3"
          style={{
            color: settings.title_color ? textColor : undefined,
            padding: `${layout === "below" ? boundedSetting(settings.text_padding_y, 0, 0, 120) : 0}px ${layout === "below" ? boundedSetting(settings.text_padding_x, 0, 0, 120) : 0}px 0`,
          }}
        >
          <h3
            data-collection-tile-title
            className="font-medium leading-tight group-hover:text-marketplace-brand"
            style={titleStyle}
          >
            {item.name}
          </h3>
          {settings.show_product_count === true &&
            typeof item.count === "number" && (
              <span className="text-xs text-marketplace-muted-foreground">
                {item.count} {kind === "category" ? "categories" : "products"}
              </span>
            )}
          {item.description && (
            <p className="text-sm text-marketplace-muted-foreground">
              {item.description}
            </p>
          )}
          {item.buttonLabel && (
            <span
              className={`${buttonClass} mt-1 ${buttonSize === "large" ? "px-5 py-2.5 text-sm" : buttonSize === "medium" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs"}`}
            >
              {item.buttonLabel}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

async function renderTiles(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
  kind: "category" | "collection",
) {
  const { basePath } = context;
  const settings = section.settings;
  const selectedFromSettings = ids(
    settings,
    kind === "category" ? "category_ids" : "collection_ids",
  );
  const cardBlockType =
    kind === "category" ? "category_card" : "collection_card";
  const cardBlocks = (section.blockOrder || []).flatMap((id) => {
    const block = section.blocks?.[id];
    if (
      !block ||
      block.disabled ||
      block.parent_id ||
      block.type !== cardBlockType
    )
      return [];
    return [{ id, settings: block.settings }];
  });
  const blockEntityIds = cardBlocks
    .map((block) =>
      string(
        block.settings,
        kind === "category" ? "category_id" : "collection_id",
      ),
    )
    .filter(Boolean);
  const selected = blockEntityIds.length
    ? blockEntityIds
    : selectedFromSettings;
  const client = getClient();
  const localeOptions = await getLocaleOptions();
  let source = cardBlocks.length
    ? "manual"
    : string(settings, "source") || "manual";
  const merchandisingPlacementId = string(
    settings,
    "merchandising_placement_id",
  );
  const matchingPlacements =
    context.kind === "home" && kind === "collection" && source === "placement"
      ? (context.placements || []).filter(
          (placement) =>
            placement.kind === "collection_tiles" &&
            (!merchandisingPlacementId ||
              placement.id === merchandisingPlacementId),
        )
      : [];
  const placementCollections = matchingPlacements.flatMap((placement) => {
    const collection = placement.collection;
    if (!collection) return [];
    return [
      {
        id: collection.id,
        name: placement.title || collection.name,
        permalink: collection.permalink,
        image_url:
          typeof placement.image_url === "string"
            ? placement.image_url
            : typeof collection.image_url === "string"
              ? collection.image_url
              : null,
      },
    ];
  });
  if (source === "placement" && placementCollections.length === 0)
    source = "all";
  if (
    source !== "all" &&
    source !== "placement" &&
    !selected.length &&
    !cardBlocks.length
  )
    return null;
  type Tile = {
    id: string;
    name: string;
    permalink: string;
    image_url?: string | null;
    products_count?: number;
    children_count?: number;
  };
  const toTiles = (items: Array<Category | Collection>): Tile[] =>
    items.map((item) => ({
      id: item.id,
      name: item.name,
      permalink: item.permalink,
      image_url: typeof item.image_url === "string" ? item.image_url : null,
      ...(kind === "collection"
        ? { products_count: (item as Collection).products_count }
        : { children_count: (item as Category).children_count }),
    }));
  const allItems: Tile[] =
    source === "placement"
      ? placementCollections
      : source === "all"
        ? kind === "category"
          ? (
              await client.categories.list(
                { depth_eq: 0, limit: 24, expand: ["children"] },
                localeOptions,
              )
            ).data.map((item) => ({
              id: item.id,
              name: item.name,
              permalink: item.permalink,
              image_url:
                typeof item.image_url === "string" ? item.image_url : null,
              children_count: item.children_count,
            }))
          : toTiles(
              (await client.collections.list({ limit: 24 }, localeOptions))
                .data,
            )
        : [];
  const selectedItems: Tile[] =
    selected.length && source !== "all"
      ? kind === "category"
        ? (
            await client.categories.list(
              { id_in: selected, limit: 24 },
              localeOptions!,
            )
          ).data.map((item) => ({
            id: item.id,
            name: item.name,
            permalink: item.permalink,
            image_url:
              typeof item.image_url === "string" ? item.image_url : null,
            children_count: item.children_count,
          }))
        : (
            await client.collections.list(
              { id_in: selected, limit: 24 },
              localeOptions!,
            )
          ).data.map((item) => ({
            id: item.id,
            name: item.name,
            permalink: item.permalink,
            image_url:
              typeof item.image_url === "string" ? item.image_url : null,
            products_count: item.products_count,
          }))
      : [];
  const visibleItems =
    source === "all" || source === "placement" ? allItems : selectedItems;
  const itemMap = new Map(visibleItems.map((item) => [item.id, item]));
  const previewImages = ids(settings, "preview_image_urls");
  const visibleOrder =
    source === "all" || source === "placement"
      ? visibleItems.map((item) => item.id)
      : selected.length
        ? selected
        : cardBlocks.map((block) => `block:${block.id}`);
  const visible = visibleOrder.flatMap((id, index) => {
    const item = itemMap.get(id);
    const block = cardBlocks.find(
      (candidate) =>
        id === `block:${candidate.id}` ||
        string(
          candidate.settings,
          kind === "category" ? "category_id" : "collection_id",
        ) === id,
    );
    if (!item && !block) return [];
    const overrideImage = block
      ? safeMediaSource(string(block.settings, "card_image_url"))
      : "";
    const overrideLink = block
      ? safeLink(string(block.settings, "link"))
      : null;
    return [
      {
        id: item?.id || `custom-${block!.id}`,
        name:
          (block && string(block.settings, "title")) ||
          item?.name ||
          (kind === "category" ? "Category" : "Collection"),
        description: block ? string(block.settings, "description") : "",
        buttonLabel: block ? string(block.settings, "button_label") : "",
        count:
          kind === "collection" ? item?.products_count : item?.children_count,
        href:
          overrideLink ||
          (item?.permalink
            ? `${basePath}/${kind === "category" ? "c" : "collections"}/${item.permalink}`
            : `${basePath}/${kind === "category" ? "c" : "collections"}`),
        image:
          overrideImage ||
          (typeof item?.image_url === "string" && item.image_url
            ? item.image_url
            : context.kind === "home"
              ? safeMediaSource(previewImages[index] || "")
              : null),
      },
    ];
  });
  const offset =
    kind === "category" && typeof settings.offset === "number"
      ? Math.max(0, settings.offset)
      : 0;
  const limited = visible.slice(offset, offset + limit(section));
  if (!limited.length) return null;
  const layout =
    section.type === "collection_gradient_overlay"
      ? "gradient"
      : section.type === "collection_text_below"
        ? "below"
        : section.type === "collection_text_hover"
          ? "hover"
          : section.type === "collection_text_overlay"
            ? "overlay"
            : section.type === "category_tiles"
              ? {
                  grid:
                    string(settings, "layout") === "circles"
                      ? "circles"
                      : "below",
                  gradient: "gradient",
                  text_below: "below",
                  text_hover: "hover",
                  text_overlay: "overlay",
                  circles: "circles",
                }[string(settings, "display_style") || "grid"] || "below"
              : string(settings, "layout");
  const carousel = settings.carousel === true || settings.layout === "carousel";
  const columnsDesktop = boundedSetting(settings.columns_desktop, 4, 1, 6);
  const columnsTablet = boundedSetting(settings.columns_tablet, 3, 1, 6);
  const columnsMobile = boundedSetting(settings.columns_mobile, 2, 1, 6);
  const desktopGap = boundedSetting(settings.grid_gap, 30, 0, 120);
  const mobileGap = boundedSetting(settings.grid_gap_mobile, 15, 0, 120);
  const tileNodes = limited.map((item) =>
    renderCollectionTile(item, settings, layout, kind),
  );
  const topMobile = boundedSetting(settings.padding_top_mobile, 20, 0, 120);
  const bottomMobile = boundedSetting(
    settings.padding_bottom_mobile,
    20,
    0,
    120,
  );
  const sectionContent = (
    <>
      {(string(settings, "subheading") ||
        string(settings, "heading") ||
        string(settings, "body")) && (
        <header className="grid gap-2">
          {string(settings, "subheading") && (
            <p className="text-xs uppercase tracking-widest text-marketplace-muted-foreground">
              {string(settings, "subheading")}
            </p>
          )}
          {string(settings, "heading") && (
            <MarketplaceSectionHeader title={string(settings, "heading")} />
          )}
          {string(settings, "body") && (
            <p className="whitespace-pre-line text-marketplace-muted-foreground">
              {string(settings, "body")}
            </p>
          )}
        </header>
      )}
      {carousel ? (
        <CollectionTileCarousel
          items={tileNodes}
          columnsDesktop={columnsDesktop}
          columnsTablet={columnsTablet}
          columnsMobile={columnsMobile}
          gap={desktopGap}
          mobileGap={mobileGap}
          loop={settings.infinite_loop === true}
          autoRotate={settings.auto_rotate === true}
          speed={Number(settings.autoplay_speed) || 5}
          arrowsDesktop={settings.show_arrows_desktop !== false}
          arrowsMobile={settings.show_arrows_mobile === true}
          paginationDesktop={settings.show_pagination_desktop === true}
          paginationMobile={settings.show_pagination_mobile === true}
          arrowColor={safeColor(string(settings, "arrow_color"), "#ffffff")}
          arrowBackground={safeColor(
            string(settings, "arrow_background"),
            "#222222",
          )}
          paginationColor={safeColor(
            string(settings, "pagination_color"),
            "#222222",
          )}
        />
      ) : (
        <div
          className="grid"
          style={
            {
              gap: desktopGap,
              gridTemplateColumns: `repeat(${columnsDesktop}, minmax(0, 1fr))`,
              ["--collection-grid-tablet" as string]: columnsTablet,
              ["--collection-grid-mobile" as string]: columnsMobile,
              ["--collection-gap-mobile" as string]: `${mobileGap}px`,
              ["--collection-card-bg" as string]: safeColor(
                string(settings, "card_background_color"),
                "#ffffff",
              ),
            } as CSSProperties
          }
          data-collection-card-grid
        >
          {tileNodes}
        </div>
      )}
      <style>{`@media(max-width:767px){[data-theme-section-frame="${section.id}"] [data-collection-card-grid]{grid-template-columns:repeat(var(--collection-grid-mobile),minmax(0,1fr))!important;gap:var(--collection-gap-mobile)!important}[data-theme-section-frame="${section.id}"] [data-theme-section-content]{padding-top:${topMobile}px!important;padding-bottom:${bottomMobile}px!important}}@media(min-width:768px) and (max-width:1023px){[data-theme-section-frame="${section.id}"] [data-collection-card-grid]{grid-template-columns:repeat(var(--collection-grid-tablet),minmax(0,1fr))!important}}${settings.hide_on_mobile === true ? `@media(max-width:767px){[data-theme-section-frame="${section.id}"]{display:none!important}}` : ""}${settings.hide_on_desktop === true ? `@media(min-width:768px){[data-theme-section-frame="${section.id}"]{display:none!important}}` : ""}${settings.remove_side_margins === true ? `[data-theme-section-frame="${section.id}"] [data-theme-section-content]{padding-left:0;padding-right:0}` : ""}`}</style>
      {settings.title_preset === "custom_hd" && (
        <style>{`@media(max-width:767px){[data-theme-section-frame="${section.id}"] [data-collection-tile-title]{font-size:${boundedSetting(settings.title_size_mobile, 16, 8, 200)}px!important}}`}</style>
      )}
      {settings.animated_hover_border === true && (
        <style>{`[data-theme-section-frame="${section.id}"] .collection-tile-animated-border{outline:1px solid transparent;transition:outline-color .2s ease}[data-theme-section-frame="${section.id}"] .collection-tile-animated-border:hover{outline-color:var(--marketplace-brand)}`}</style>
      )}
    </>
  );
  return sectionFrame(
    section,
    sectionContent,
    settings.full_width === true ? "!w-full" : "",
  );
}

function personalizationReasonSubtitle(
  settings: Record<string, unknown>,
  locale: string,
): string | undefined {
  const codes = settings.personalization_reason_codes;
  if (!Array.isArray(codes) || !codes.length) return undefined;
  const code = String(codes[0]);
  const labels: Record<string, string> = {
    similar_to_favorites: "Similar to your favorites",
    inspired_by_recent_searches: "Inspired by your recent searches",
    related_to_cart: "Related to items in your cart",
    from_shops_you_follow: "From shops you follow",
    similar_to_purchases: "Similar to your purchases",
    based_on_your_interests: "Based on your interests",
    discover_something_new: "Discover something new",
  };
  return labels[code];
}

async function renderProductRail(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const settings = section.settings;
  const source = string(settings, "source");
  if (source === "manual" && !ids(settings, "manual_product_ids").length)
    return null;
  const merchandisingPlacementId = string(
    settings,
    "merchandising_placement_id",
  );
  const merchandisingPlacement =
    context.kind === "home" && source === "placement"
      ? (context.placements || []).find(
          (placement) =>
            placement.kind === "product_rail" &&
            (!merchandisingPlacementId ||
              placement.id === merchandisingPlacementId),
        )
      : undefined;
  const sort =
    string(settings, "strategy") === "newest"
      ? "newest"
      : string(settings, "strategy") === "best_selling"
        ? "popular"
        : string(settings, "strategy") === "featured"
          ? "popular"
          : undefined;
  let products: Product[] = [];
  if (merchandisingPlacement) products = merchandisingPlacement.products || [];
  else if (source === "placement")
    products = await listRecommendationProducts("trending");
  else if (source === "all")
    products = await listCatalogProducts({ limit: 24, sort });
  else if (source === "trending" && string(settings, "strategy") === "featured")
    products = await listRecommendationProducts("trending");
  else if (source === "new_arrivals")
    products = await listRecommendationProducts("new");
  else if (source === "best_selling")
    products = await listCatalogProducts({ limit: 24, sort: "popular" });
  else if (source === "collection") {
    products = await listCatalogProducts({
      in_collection: string(settings, "collection_id"),
      limit: limit(section),
      sort,
    });
  } else if (source === "category") {
    products = await listCatalogProducts({
      in_category: string(settings, "category_id"),
      limit: limit(section),
      sort,
    });
  } else if (source === "manual") {
    const selected = ids(settings, "manual_product_ids");
    const fetched = await listCatalogProducts({
      id_in: selected,
      limit: 24,
      expand: ["seller"],
    });
    const byId = new Map(fetched.map((product) => [product.id, product]));
    products = selected.flatMap((id) => byId.get(id) || []);
  } else if (source === "on_sale") {
    products = await listCatalogProducts({ on_sale: true, limit: 24, sort });
  }
  if (source === "trending" && string(settings, "strategy") !== "featured")
    products = await listCatalogProducts({ limit: 24, sort });
  if ((source === "trending" || source === "new_arrivals") && !products.length)
    products = await listCatalogProducts({
      limit: 24,
      sort: source === "new_arrivals" ? "newest" : sort,
    });
  products = products.slice(0, limit(section));
  if (!products.length) return null;
  const headingText = string(settings, "heading");
  const reasonSubtitle = personalizationReasonSubtitle(
    settings,
    context.locale,
  );
  const viewAllHref = `${context.basePath}/products?q=${encodeURIComponent(headingText)}`;
  const tHome = await getTranslations({
    locale: context.locale as Locale,
    namespace: "home",
  });
  const isCarousel = string(settings, "layout") !== "grid";
  const heading = (
    <MarketplaceSectionHeader
      density={isCarousel ? "etsy" : "compact"}
      className={isCarousel ? "mb-0" : undefined}
      title={headingText}
      description={reasonSubtitle}
      action={
        isCarousel ? (
          <Link
            href={viewAllHref}
            className={marketplaceEtsyOutlineButtonClass}
          >
            {tHome("viewAll")}
          </Link>
        ) : undefined
      }
    />
  );
  const sectionBackground = string(settings, "background_color");
  const warmRailSurface =
    isCarousel && !sectionBackground ? "bg-marketplace-background" : "";
  const framedSection = isCarousel
    ? {
        ...section,
        settings: {
          ...settings,
          padding_top:
            typeof settings.padding_top === "number"
              ? settings.padding_top
              : 12,
          padding_bottom:
            typeof settings.padding_bottom === "number"
              ? settings.padding_bottom
              : 16,
          gap: typeof settings.gap === "number" ? settings.gap : 12,
        },
      }
    : section;
  const sponsoredEligible = themeSettingEnabled(settings.sponsored_eligible);
  const organicProductIds = products.map((product) => product.id);

  const railBody = (
    <>
      {heading}
      {string(settings, "layout") === "grid" ? (
        <ProductGrid
          products={products}
          basePath={context.basePath}
          currency={context.currency}
          listId={listId(context, section, "product-grid")}
          listName={string(settings, "heading")}
          columns={
            typeof settings.columns === "number"
              ? Math.max(2, Math.min(6, settings.columns))
              : undefined
          }
          gap={typeof settings.gap === "number" ? settings.gap : undefined}
        />
      ) : (
        <div className="relative min-w-0 w-full">
          <ProductCarousel
            products={products}
            basePath={context.basePath}
            currency={context.currency}
            listId={listId(context, section, "product-rail")}
            listName={headingText}
            variant="etsy"
          />
        </div>
      )}
    </>
  );

  return (
    <>
      {sectionFrame(framedSection, railBody, warmRailSurface)}
      {sponsoredEligible ? (
        <SponsoredDiscoveryRailSection
          placement="homepage_rail"
          titleKey="sponsoredPicks"
          titleNamespace="home"
          basePath={context.basePath}
          locale={context.locale}
          currency={context.currency}
          limit={limit(section)}
          organicProductIds={organicProductIds}
        />
      ) : null}
    </>
  );
}

async function renderFeaturedCollection(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const collectionId = string(section.settings, "collection_id");
  if (!collectionId) return null;
  const options = await getLocaleOptions();
  let collection: Collection;
  let products: Product[];
  try {
    collection = await getClient().collections.get(
      collectionId,
      undefined,
      options,
    );
    const response = await getClient().collections.products.list(
      collectionId,
      {
        limit: Math.min(
          24,
          Math.max(1, Number(section.settings.product_count) || 8),
        ),
        expand: ["seller", "media"],
      },
      options,
    );
    products = response.data ?? [];
  } catch {
    return null;
  }
  const blockEntries = (section.blockOrder || [])
    .map((id) => section.blocks?.[id])
    .filter((block): block is NonNullable<typeof block> =>
      Boolean(
        block &&
          !block.disabled &&
          (!block.parent_id || !section.blocks?.[block.parent_id]?.disabled),
      ),
    );
  const carousel = section.settings.type === "carousel";
  const carouselContentBlocks = carousel
    ? (section.blockOrder || []).flatMap((id) => {
        const block = section.blocks?.[id];
        return block &&
          !block.disabled &&
          !block.parent_id &&
          ["button", "heading", "text"].includes(block.type)
          ? [{ id, block }]
          : [];
      })
    : [];
  const header = carousel
    ? blockEntries.find((block) => block.type === "collection_header")
        ?.settings || {}
    : {};
  const titleEntry = carousel
    ? blockEntries.find((block) => block.type === "collection_title")
    : undefined;
  const buttonEntry = carousel
    ? blockEntries.find((block) => block.type === "view_all_button")
    : undefined;
  const titleBlock = titleEntry?.settings || {};
  const button = buttonEntry?.settings || {};
  const blockIdFor = (entry?: (typeof blockEntries)[number]) =>
    entry
      ? Object.entries(section.blocks || {}).find(
          ([, block]) => block === entry,
        )?.[0]
      : undefined;
  const productCardEntry = Object.entries(section.blocks || {}).find(
    ([, block]) => block.type === "product_card",
  );
  const productCardBlock = productCardEntry?.[1];
  const productCardId = productCardEntry?.[0];
  const productCardParts = productCardBlock
    ? (section.blockOrder || [])
        .map((id) => section.blocks?.[id])
        .filter((block): block is NonNullable<typeof block> =>
          Boolean(
            block && block.parent_id === productCardId && !block.disabled,
          ),
        )
    : [];
  const buyButtons = productCardParts.find(
    (part) => part.type === "buy_buttons",
  );
  const title =
    typeof titleBlock.text === "string" &&
    titleBlock.text &&
    titleBlock.text !== "Collection title"
      ? titleBlock.text
      : collection.name;
  const Heading = (
    ["h1", "h2", "h3", "h4"].includes(String(titleBlock.level))
      ? String(titleBlock.level)
      : "h2"
  ) as "h1" | "h2" | "h3" | "h4";
  const titleMarkup = sanitizeThemeRichText(title).replace(
    /<\/?(?:p|ul|ol|li|h[1-6]|blockquote|pre)\b[^>]*>/gi,
    "",
  );
  const titlePreset: Record<string, string> = {
    heading_1: "text-4xl md:text-6xl",
    heading_2: "text-3xl md:text-4xl",
    heading_3: "text-2xl md:text-3xl",
    heading_4: "text-xl md:text-2xl",
  };
  const titleMaxWidth: Record<string, string> = {
    narrow: "max-w-prose",
    normal: "max-w-3xl",
    wide: "max-w-5xl",
    full: "max-w-none",
  };
  const titleWidth = titleBlock.width === "fill" ? "w-full" : "w-fit";
  const titleStyle: CSSProperties = {
    color:
      typeof titleBlock.text_color === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(titleBlock.text_color)
        ? titleBlock.text_color
        : titleBlock.text_color === "palette"
          ? "var(--marketplace-foreground)"
          : undefined,
    backgroundColor:
      themeSettingEnabled(titleBlock.background_enabled) &&
      typeof titleBlock.background_color === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(titleBlock.background_color)
        ? titleBlock.background_color
        : themeSettingEnabled(titleBlock.background_enabled) &&
            titleBlock.background_color === "palette"
          ? "var(--marketplace-surface-warm)"
          : undefined,
    paddingTop: Number(titleBlock.padding_top) || undefined,
    paddingBottom: Number(titleBlock.padding_bottom) || undefined,
    paddingLeft: Number(titleBlock.padding_left) || undefined,
    paddingRight: Number(titleBlock.padding_right) || undefined,
  };
  const collectionHref = `${context.basePath}/collections/${collection.permalink || collectionId}`;
  const productsListId = listId(context, section, "featured-collection-items");
  const columns = Math.max(
    2,
    Math.min(6, Number(section.settings.columns) || 4),
  );
  const mobileColumns = section.settings.mobile_columns === "2" ? 2 : 1;
  const horizontalGap = Math.max(
    0,
    Math.min(120, Number(section.settings.horizontal_gap) || 0),
  );
  const verticalGap = Math.max(
    0,
    Math.min(120, Number(section.settings.vertical_gap) || 24),
  );
  const schemeBackgrounds: Record<string, string> = {
    "scheme-1": "#ffffff",
    "scheme-2": "#f6f1e8",
    "scheme-3": "#e8f4ef",
    "scheme-4": "#f0f3fa",
    "scheme-5": "#fff5e8",
  };
  const background =
    typeof section.settings.background_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(section.settings.background_color)
      ? section.settings.background_color
      : section.settings.background_color === "palette"
        ? schemeBackgrounds[string(section.settings, "theme_color_scheme")] ||
          schemeBackgrounds["scheme-1"]
        : undefined;
  const fullWidth = section.settings.width === "full";
  const widthClass = fullWidth
    ? "w-full px-5"
    : "mx-auto w-full max-w-[1440px] px-5";
  const headerDirection =
    header.direction === "vertical" ? "flex-col" : "flex-row";
  const buttonLabel =
    typeof button.label === "string" ? button.label : "View all";
  const buttonStyle =
    button.style === "secondary"
      ? "border"
      : button.style === "custom"
        ? "border"
        : "";
  const buttonVariant =
    button.style === "secondary"
      ? "secondary"
      : button.style === "custom"
        ? "outline"
        : "default";
  const buttonWidth =
    button.mobile_width === "custom"
      ? button.desktop_width === "custom"
        ? "w-full"
        : "w-full md:w-fit"
      : button.desktop_width === "custom"
        ? "w-fit md:w-full"
        : "w-fit";
  const headerBackground =
    typeof header.background_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(header.background_color)
      ? header.background_color
      : header.background_color === "palette"
        ? "var(--marketplace-surface-warm)"
        : undefined;
  const headerAlignment =
    section.settings.alignment === "center" ||
    section.settings.alignment === "right"
      ? section.settings.alignment
      : ["left", "center", "right", "space_between"].includes(
            String(header.alignment),
          )
        ? (String(header.alignment) as
            | "left"
            | "center"
            | "right"
            | "space_between")
        : "left";
  const headerBackgroundImage =
    header.background_media === "image"
      ? safeMediaSource(string(header, "background_image_url"))
      : "";
  const headerBackgroundVideo =
    header.background_media === "video"
      ? safeMediaSource(string(header, "background_video_url"))
      : "";
  const customCss = string(section.settings, "custom_css");
  const safeCustomCss =
    /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(customCss)
      ? ""
      : customCss.replace(
          /([^{}]+)\{([^{}]*)\}/g,
          (_rule, selectors: string, declarations: string) =>
            selectors.trim().startsWith("@")
              ? ""
              : `${selectors
                  .split(",")
                  .map(
                    (selector) =>
                      `[data-featured-collection="${section.id}"] ${selector.trim()}`,
                  )
                  .join(", ")} {${declarations}}`,
        );
  const gridStyle = {
    "--featured-columns": columns,
    "--featured-mobile-columns": mobileColumns,
    "--featured-column-gap": `${horizontalGap}px`,
    "--featured-row-gap": `${verticalGap}px`,
  } as CSSProperties;
  const wrapperStyle: CSSProperties = {
    backgroundColor: background,
    paddingTop:
      typeof section.settings.padding_top === "number"
        ? section.settings.padding_top
        : 48,
    paddingBottom:
      typeof section.settings.padding_bottom === "number"
        ? section.settings.padding_bottom
        : 48,
    color:
      typeof section.settings.theme_text_color === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(section.settings.theme_text_color)
        ? section.settings.theme_text_color
        : undefined,
  };

  return (
    <section data-featured-collection={section.id} style={wrapperStyle}>
      {safeCustomCss ? <style>{safeCustomCss}</style> : null}
      <div className={widthClass}>
        <div
          className={`featured-collection-header relative flex overflow-hidden ${headerDirection}${themeSettingEnabled(header.vertical_on_mobile) ? " featured-header-vertical-mobile" : ""} featured-header-mobile-${header.mobile_width === "custom" ? "custom" : header.mobile_width === "fit" ? "fit" : "fill"}`}
          style={{
            gap: Number(header.gap) || 12,
            marginBottom: Number(section.settings.gap) || 28,
            alignItems: themeSettingEnabled(header.text_baseline)
              ? "baseline"
              : header.position === "middle"
                ? "center"
                : header.position === "bottom"
                  ? "flex-end"
                  : "flex-start",
            justifyContent:
              headerAlignment === "center"
                ? "center"
                : headerAlignment === "right"
                  ? "flex-end"
                  : headerAlignment === "space_between"
                    ? "space-between"
                    : "flex-start",
            textAlign:
              headerAlignment === "space_between" ? "left" : headerAlignment,
            width:
              header.width === "fit"
                ? "fit-content"
                : header.width === "custom"
                  ? `${Math.max(0, Math.min(2000, Number(header.width_custom) || 0))}px`
                  : "100%",
            minHeight:
              header.height === "fill"
                ? 96
                : header.height === "custom"
                  ? Math.max(
                      0,
                      Math.min(2000, Number(header.height_custom) || 0),
                    )
                  : undefined,
            backgroundColor: headerBackground,
            border:
              header.border_style === "solid"
                ? "1px solid var(--marketplace-border)"
                : undefined,
            borderRadius: Number(header.corner_radius) || undefined,
            paddingTop: Number(header.padding_top) || undefined,
            paddingBottom: Number(header.padding_bottom) || undefined,
            paddingLeft: Number(header.padding_left) || undefined,
            paddingRight: Number(header.padding_right) || undefined,
          }}
        >
          {headerBackgroundImage ? (
            <Image
              src={headerBackgroundImage}
              alt=""
              fill
              sizes="100vw"
              unoptimized
              className="pointer-events-none object-cover"
            />
          ) : headerBackgroundVideo ? (
            <video
              src={headerBackgroundVideo}
              autoPlay
              muted
              loop
              playsInline
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div className="relative z-10 min-w-0">
            {titleEntry && title ? (
              <div
                data-theme-block-id={blockIdFor(titleEntry)}
                className={`${titleWidth} ${titleMaxWidth[String(titleBlock.max_width)] || titleMaxWidth.normal}`}
              >
                <Heading
                  className={`font-display font-semibold ${titlePreset[String(titleBlock.preset)] || titlePreset.heading_2}`}
                  style={titleStyle}
                  dangerouslySetInnerHTML={{
                    __html: titleMarkup,
                  }}
                />
              </div>
            ) : null}
          </div>
          {buttonEntry &&
            products.length > 0 &&
            (!themeSettingEnabled(button.show_if_more) ||
              (collection.products_count ?? products.length) >
                products.length) && (
              <Link
                data-theme-block-id={blockIdFor(buttonEntry)}
                data-slot="button"
                data-variant={buttonVariant}
                href={collectionHref}
                target={
                  themeSettingEnabled(button.open_in_new_tab)
                    ? "_blank"
                    : undefined
                }
                rel={
                  themeSettingEnabled(button.open_in_new_tab)
                    ? "noopener noreferrer"
                    : undefined
                }
                className={`relative z-10 inline-flex shrink-0 items-center justify-center rounded-md px-4 py-2 text-sm font-medium ${buttonStyle} ${buttonWidth}`}
              >
                {buttonLabel}
              </Link>
            )}
        </div>
        {carouselContentBlocks.length > 0 ? (
          <div data-featured-carousel-content className="mb-6 space-y-3">
            {carouselContentBlocks.map(({ id, block }) => (
              <div
                key={id}
                data-theme-block-id={id}
                data-theme-block-type={block.type}
              >
                <ThemeBlockRenderer block={block} context={context} />
              </div>
            ))}
          </div>
        ) : null}
        {themeSettingEnabled(section.settings.product_cards, true) &&
        !themeSettingEnabled(productCardBlock?.disabled) &&
        products.length > 0 ? (
          <div
            id={productsListId}
            className={`${carousel ? "featured-collection-carousel" : "featured-collection-grid"}${carousel && themeSettingEnabled(section.settings.carousel_on_mobile) ? " featured-mobile-carousel" : ""}`}
            style={gridStyle}
          >
            {products.map((product) => (
              <FeaturedCollectionProductCard
                key={product.id}
                product={product}
                parts={
                  productCardBlock
                    ? [productCardBlock, ...productCardParts]
                    : productCardParts
                }
                basePath={context.basePath}
                currency={context.currency}
                showSecondImageOnHover={
                  section.settings.show_second_image_on_hover !== undefined
                    ? themeSettingEnabled(
                        section.settings.show_second_image_on_hover,
                      )
                    : undefined
                }
                quickAdd={
                  buyButtons
                    ? themeSettingEnabled(buyButtons.settings.quick_add)
                    : themeSettingEnabled(section.settings.quick_add) ||
                      themeSettingEnabled(productCardBlock?.settings.quick_add)
                }
                mobileQuickAdd={themeSettingEnabled(
                  section.settings.mobile_quick_add,
                )}
                transition={
                  string(section.settings, "product_card_transition") !== "none"
                    ? string(section.settings, "product_card_transition")
                    : string(productCardBlock?.settings || {}, "transition")
                }
              />
            ))}
          </div>
        ) : null}
        {carousel && products.length > 0 ? (
          <FeaturedCollectionNavigation
            listId={productsListId}
            count={products.length}
            icon={string(section.settings, "navigation_icon")}
            background={string(section.settings, "navigation_icon_background")}
          />
        ) : null}
        {products.length === 0 ? (
          <p className="rounded-md bg-marketplace-surface-warm px-4 py-6 text-center text-sm text-marketplace-muted-foreground">
            This collection does not have any products to show yet.
          </p>
        ) : null}
      </div>
      <style>{`[data-featured-collection="${section.id}"] .featured-collection-grid{display:grid;grid-template-columns:repeat(var(--featured-mobile-columns),minmax(0,1fr));column-gap:var(--featured-column-gap);row-gap:var(--featured-row-gap)}@media(min-width:768px){[data-featured-collection="${section.id}"] .featured-collection-grid{grid-template-columns:repeat(var(--featured-columns),minmax(0,1fr))}}[data-featured-collection="${section.id}"] .featured-collection-carousel{display:grid;grid-auto-columns:minmax(190px,1fr);grid-auto-flow:column;overflow-x:auto;scroll-snap-type:x mandatory;column-gap:var(--featured-column-gap);row-gap:var(--featured-row-gap)}[data-featured-collection="${section.id}"] .featured-collection-carousel>*{scroll-snap-align:start}@media(max-width:767px){[data-featured-collection="${section.id}"] .featured-collection-carousel{grid-auto-columns:minmax(72%,1fr)}[data-featured-collection="${section.id}"] .featured-mobile-carousel{grid-template-columns:none;grid-auto-columns:minmax(72%,1fr);grid-auto-flow:column;overflow-x:auto;scroll-snap-type:x mandatory}[data-featured-collection="${section.id}"] .featured-mobile-carousel>*{scroll-snap-align:start}[data-featured-collection="${section.id}"] .featured-header-vertical-mobile{flex-direction:column}[data-featured-collection="${section.id}"] .featured-header-mobile-fit{width:fit-content!important}[data-featured-collection="${section.id}"] .featured-header-mobile-fill{width:100%!important}[data-featured-collection="${section.id}"] .featured-header-mobile-custom{width:${Math.max(0, Math.min(2000, Number(header.mobile_width_custom) || 0))}px!important}}`}</style>
    </section>
  );
}

async function renderShopRail(
  section: MarketplaceSectionWire,
  context: ThemeRenderContext,
) {
  const settings = section.settings;
  const source = string(settings, "source");
  if (source === "manual" && !ids(settings, "manual_seller_ids").length)
    return null;
  const localeOptions = await getLocaleOptions();
  let sellers: Seller[] = [];
  try {
    if (source === "manual") {
      const selected = ids(settings, "manual_seller_ids");
      const response = await getClient().sellers.list(
        {
          id_in: selected,
          limit: 24,
        },
        localeOptions,
      );
      const byId = new Map(response.data.map((seller) => [seller.id, seller]));
      sellers = selected.flatMap((id) => byId.get(id) || []);
    } else {
      const response = await getClient().sellers.list(
        {
          limit: limit(section),
          sort: source || "popular",
        },
        localeOptions,
      );
      sellers = response.data;
      const metric = (seller: Seller, key: string) => {
        const value = (seller as unknown as Record<string, unknown>)[key];
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
      };
      if (source === "highest_rated")
        sellers.sort(
          (a, b) => metric(b, "average_rating") - metric(a, "average_rating"),
        );
      else if (source === "most_followed")
        sellers.sort(
          (a, b) => metric(b, "followers_count") - metric(a, "followers_count"),
        );
      else
        sellers.sort(
          (a, b) => metric(b, "reviews_count") - metric(a, "reviews_count"),
        );
    }
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("name" in error) ||
      error.name !== "AbortError"
    )
      throw error;
    console.warn(
      `[theme] Shop rail ${section.id} timed out; omitting section.`,
    );
    return null;
  }
  sellers = sellers.slice(0, limit(section));
  if (!sellers.length) return null;
  return (
    <MarketplaceSection
      className="py-[var(--cms-section-spacing)]"
      data-list-id={listId(context, section, "shop-rail")}
    >
      <MarketplacePage>
        <MarketplaceSectionHeader title={string(settings, "heading")} />
        <CollectionTileCarousel
          items={sellers.map((seller) => (
            <ShopCard
              key={seller.id}
              seller={seller}
              basePath={context.basePath}
              locale={context.locale}
              className="h-full w-full"
            />
          ))}
          columnsDesktop={boundedSetting(settings.columns_desktop, 4, 1, 6)}
          columnsTablet={boundedSetting(settings.columns_tablet, 2, 1, 6)}
          columnsMobile={boundedSetting(settings.columns_mobile, 1, 1, 6)}
          gap={boundedSetting(settings.grid_gap, 24, 0, 80)}
          mobileGap={boundedSetting(settings.grid_gap_mobile, 16, 0, 80)}
          loop={settings.infinite_loop === true}
          autoRotate={settings.auto_rotate === true}
          speed={Number(settings.autoplay_speed) || 5}
          arrowsDesktop={settings.show_arrows_desktop !== false}
          arrowsMobile={settings.show_arrows_mobile === true}
          paginationDesktop={settings.show_pagination_desktop === true}
          paginationMobile={settings.show_pagination_mobile === true}
          arrowColor={safeColor(string(settings, "arrow_color"), "#ffffff")}
          arrowBackground={safeColor(
            string(settings, "arrow_background"),
            "#222222",
          )}
          paginationColor={safeColor(
            string(settings, "pagination_color"),
            "#222222",
          )}
          itemLabel="shops"
        />
      </MarketplacePage>
    </MarketplaceSection>
  );
}

async function renderEditorial(section: MarketplaceSectionWire) {
  const settings = section.settings;
  const image = safeMediaSource(string(settings, "image_url"));
  const secondaryImage = safeMediaSource(
    string(settings, "secondary_image_url"),
  );
  const link = safeLink(string(settings, "button_link"));
  const gap = typeof settings.gap === "number" ? settings.gap : 32;
  const alignment =
    settings.alignment === "center" || settings.alignment === "right"
      ? settings.alignment
      : "left";
  if (section.type === "hero_banner" || section.type === "featured_banner") {
    const hero = section.type === "hero_banner";
    return sectionFrame(
      section,
      <div
        data-theme-section-content
        className={`relative isolate flex overflow-hidden rounded-xl bg-marketplace-surface-warm ${hero ? "min-h-[28rem] items-center justify-center text-center" : "min-h-[22rem] items-end"}`}
      >
        {image ? (
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
        ) : null}
        <div
          className={`w-full p-8 md:p-12 ${hero ? "bg-black/35 text-white" : "bg-gradient-to-t from-black/70 to-transparent text-white"} ${alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left"}`}
        >
          {string(settings, "eyebrow") ? (
            <p className="text-xs uppercase tracking-widest opacity-80">
              {string(settings, "eyebrow")}
            </p>
          ) : null}
          <h2
            data-theme-section-heading
            className={`mt-2 font-display font-semibold ${hero ? "text-4xl md:text-6xl" : "text-3xl md:text-4xl"}`}
          >
            {string(settings, "heading")}
          </h2>
          {string(settings, "body") ? (
            <p className="mt-3 max-w-2xl whitespace-pre-line text-sm opacity-90 md:text-base">
              {string(settings, "body")}
            </p>
          ) : null}
          {link && string(settings, "button_text") ? (
            <Link
              href={link}
              className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-marketplace-foreground"
            >
              {string(settings, "button_text")}
            </Link>
          ) : null}
        </div>
      </div>,
    );
  }
  return sectionFrame(
    section,
    <div data-theme-section-content>
      <div className="grid items-center md:grid-cols-2" style={{ gap }}>
        <div
          className={`${string(settings, "image_position") === "left" ? "md:order-last " : ""}${alignment === "center" ? "text-center" : alignment === "right" ? "text-right" : "text-left"}`}
        >
          {string(settings, "eyebrow") && (
            <p className="text-xs uppercase tracking-widest text-marketplace-brand">
              {string(settings, "eyebrow")}
            </p>
          )}
          <h2
            data-theme-section-heading
            className="mt-3 font-display text-3xl font-semibold text-marketplace-brand"
          >
            {string(settings, "heading")}
          </h2>
          <p
            data-theme-section-body
            hidden={!string(settings, "body")}
            className="mt-4 text-marketplace-muted-foreground"
          >
            {string(settings, "body")}
          </p>
          {link && string(settings, "button_text") && (
            <Link
              className="mt-6 inline-block border-b border-marketplace-brand pb-1 text-marketplace-brand"
              href={link}
            >
              {string(settings, "button_text")}
            </Link>
          )}
        </div>
        <div
          data-theme-section-media
          hidden={!image && !secondaryImage}
          className="relative min-h-64"
        >
          <img
            data-theme-section-image
            src={image || undefined}
            alt=""
            hidden={!image}
            className="h-full w-full object-cover"
          />
          <img
            data-theme-section-secondary-image
            src={secondaryImage || undefined}
            alt=""
            hidden={!secondaryImage}
            className={`${image ? "absolute bottom-4 left-4 max-h-1/2 w-1/3 shadow-xl" : "h-full w-full"} object-cover`}
          />
        </div>
      </div>
    </div>,
    string(settings, "background_color") === "default"
      ? "bg-marketplace-background"
      : "",
  );
}

async function renderRichText(section: MarketplaceSectionWire) {
  const blocks = Array.isArray(section.settings.blocks)
    ? section.settings.blocks
    : [];
  return (
    <MarketplaceSection className="py-[var(--cms-section-spacing)]">
      <MarketplacePage className="max-w-3xl">
        <div data-theme-section-content>
          {blocks.map((block, index) => {
            const typed = block as { type?: string; text?: string };
            if (typed.type === "heading") {
              return (
                <h2
                  key={index}
                  className="mt-8 font-display text-2xl font-semibold"
                >
                  {typed.text}
                </h2>
              );
            }
            return typed.type === "list_item" ? (
              <p
                key={index}
                className="mt-2 pl-5 text-marketplace-muted-foreground before:-ml-5 before:mr-2 before:content-['•']"
              >
                {typed.text}
              </p>
            ) : (
              <p key={index} className="mt-4 text-marketplace-muted-foreground">
                {typed.text}
              </p>
            );
          })}
        </div>
      </MarketplacePage>
    </MarketplaceSection>
  );
}

async function renderTrust(section: MarketplaceSectionWire) {
  const items = Array.isArray(section.settings.items)
    ? section.settings.items.filter(
        (item): item is { icon: string; title: string; body: string } =>
          Boolean(
            item &&
              typeof item === "object" &&
              "icon" in item &&
              typeof item.icon === "string" &&
              "title" in item &&
              typeof item.title === "string" &&
              "body" in item &&
              typeof item.body === "string",
          ),
      )
    : [];
  return (
    <MarketplaceSection className="py-[var(--cms-section-spacing)]">
      <MarketplacePage className="border-t border-marketplace-border-subtle text-center">
        {string(section.settings, "heading") && (
          <h2 className="font-display text-2xl font-semibold text-marketplace-brand">
            {string(section.settings, "heading")}
          </h2>
        )}
        {string(section.settings, "body") && (
          <p className="mx-auto mt-3 max-w-2xl text-marketplace-muted-foreground">
            {string(section.settings, "body")}
          </p>
        )}
        {items.length > 0 && (
          <ul className="mt-8 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const iconName = iconNames.includes(item.icon as IconName)
                ? (item.icon as IconName)
                : "heart";
              return (
                <li key={`${item.title}-${index}`} className="flex gap-3">
                  <SpreeIcon
                    name={iconName}
                    className="mt-0.5 size-5 shrink-0 text-marketplace-brand"
                  />
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    {item.body && (
                      <span className="mt-1 block text-sm text-marketplace-muted-foreground">
                        {item.body}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </MarketplacePage>
    </MarketplaceSection>
  );
}
