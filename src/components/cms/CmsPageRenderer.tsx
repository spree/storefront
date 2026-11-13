import type { Product, ProductListParams, Seller } from "@spree/sdk";
import Link from "next/link";
import {
  MarketplacePage,
  MarketplaceRail,
  MarketplaceSection,
  MarketplaceSectionHeader,
} from "@/components/marketplace";
import { ProductRecommendationRail } from "@/components/products/ProductRecommendationRail";
import { ShopCard } from "@/components/shops/ShopCard";
import type { MarketplaceSectionWire } from "@/components/theme/render-marketplace-sections";
import {
  isMarketplaceSectionType,
  renderMarketplaceSection,
} from "@/components/theme/render-marketplace-sections";
import { getClient, getLocaleOptions } from "@/lib/spree";
import { marketplaceFor } from "@/lib/spree/marketplace";
import type { ThemeRenderContext } from "@/lib/theme/types";
import type { CmsPage, CmsSection, CmsTheme } from "./types";

type Context = {
  basePath: string;
  locale: string;
  currency?: string;
  page: CmsPage;
};
type Renderer = (
  section: CmsSection,
  context: Context,
) => Promise<React.ReactNode>;

function string(settings: CmsSection["settings"], key: string): string {
  return typeof settings[key] === "string" ? (settings[key] as string) : "";
}

function ids(settings: CmsSection["settings"], key: string): string[] {
  return Array.isArray(settings[key])
    ? (settings[key] as unknown[]).filter(
        (id): id is string => typeof id === "string",
      )
    : [];
}

function limit(section: CmsSection): number {
  const value = section.settings.limit;
  return typeof value === "number" ? Math.min(24, Math.max(1, value)) : 8;
}

async function listCatalogProducts(
  params?: ProductListParams,
): Promise<Product[]> {
  const options = await getLocaleOptions();
  try {
    const response = await getClient().products.list(params, options);
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
            { limit: 24, expand: ["seller"] },
            options,
          )
        : await marketplace.recommendations.new(
            { limit: 24, expand: ["seller"] },
            options,
          );
    return response.data ?? [];
  } catch {
    return [];
  }
}

function safeLink(href: string, basePath: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("https://")) return href;
  return href ? null : `${basePath}/products`;
}

async function hero(section: CmsSection, { basePath }: Context) {
  const { settings } = section;
  const image = string(settings, "image_url");
  const link = safeLink(string(settings, "button_link"), basePath);
  const layout = string(settings, "layout");
  return (
    <MarketplaceSection surface="warm" className="py-0">
      <MarketplacePage
        className={`grid gap-0 bg-marketplace-surface-warm px-0 ${image && layout !== "centered" ? "md:grid-cols-2" : ""}`}
      >
        <div
          className={`flex flex-col justify-center px-6 py-12 md:px-12 md:py-20 ${layout === "centered" || !image ? "items-center text-center" : layout === "image_left" ? "md:order-last" : ""}`}
        >
          {string(settings, "eyebrow") && (
            <p className="text-xs uppercase tracking-widest text-marketplace-brand">
              {string(settings, "eyebrow")}
            </p>
          )}
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-marketplace-brand md:text-6xl">
            {string(settings, "heading")}
          </h1>
          {string(settings, "subheading") && (
            <p className="mt-5 max-w-xl text-marketplace-muted-foreground">
              {string(settings, "subheading")}
            </p>
          )}
          {link && string(settings, "button_text") && (
            <Link
              className="mt-8 w-fit border-b border-marketplace-brand pb-1 text-marketplace-brand"
              href={link}
            >
              {string(settings, "button_text")}
            </Link>
          )}
        </div>
        {image && (
          <div
            className={`min-h-72 md:min-h-[32rem] ${layout === "image_left" ? "md:order-first" : ""}`}
          >
            <img src={image} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </MarketplacePage>
    </MarketplaceSection>
  );
}

async function tiles(
  section: CmsSection,
  { basePath }: Context,
  kind: "category" | "collection",
) {
  const { settings } = section;
  const selected = ids(
    settings,
    kind === "category" ? "category_ids" : "collection_ids",
  );
  if (!selected.length) return null;
  const client = getClient();
  const response =
    kind === "category"
      ? await client.categories.list({ id_in: selected, limit: 24 })
      : await client.collections.list({ id_in: selected, limit: 24 });
  const items = new Map(response.data.map((item) => [item.id, item]));
  const visible = selected.flatMap((id) => {
    const item = items.get(id);
    if (!item) return [];
    return [
      {
        id: item.id,
        name: item.name,
        href: `${basePath}/${kind === "category" ? "c" : "collections"}/${item.permalink}`,
        image: typeof item.image_url === "string" ? item.image_url : null,
      },
    ];
  });
  if (!visible.length) return null;
  return (
    <MarketplaceSection className="py-[var(--cms-section-spacing)]">
      <MarketplacePage>
        <MarketplaceSectionHeader title={string(settings, "heading")} />
        <div
          className={
            string(settings, "layout") === "rail"
              ? "flex gap-5 overflow-x-auto pb-2"
              : "grid grid-cols-2 gap-5 md:grid-cols-4"
          }
        >
          {visible.map((item) => (
            <Link key={item.id} href={item.href} className="group">
              <div
                className={`aspect-[4/3] bg-marketplace-surface-warm ${string(settings, "layout") === "rail" ? "w-56 shrink-0" : ""}`}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <h3 className="mt-3 font-medium text-marketplace-foreground group-hover:text-marketplace-brand">
                {item.name}
              </h3>
            </Link>
          ))}
        </div>
      </MarketplacePage>
    </MarketplaceSection>
  );
}

async function productRail(section: CmsSection, context: Context) {
  const { settings } = section;
  const source = string(settings, "source");
  const sort =
    string(settings, "strategy") === "newest"
      ? "newest"
      : string(settings, "strategy") === "best_selling"
        ? "popular"
        : undefined;
  let products: Product[] = [];
  if (source === "trending")
    products = await listRecommendationProducts("trending");
  else if (source === "new_arrivals")
    products = await listRecommendationProducts("new");
  else if (source === "collection") {
    products = await listCatalogProducts({
      collection_id: string(settings, "collection_id"),
      limit: limit(section),
      sort,
    });
  } else if (source === "category") {
    products = await listCatalogProducts({
      category_id: string(settings, "category_id"),
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
    products = (await listCatalogProducts({ limit: 24 })).filter(
      (product) =>
        (product.price.compare_at_amount_in_cents || 0) >
        (product.price.amount_in_cents || 0),
    );
  }
  if (
    (source === "trending" || source === "new_arrivals") &&
    !products.length
  ) {
    products = await listCatalogProducts({
      limit: limit(section),
      expand: ["seller"],
    });
  }
  products = products.slice(0, limit(section));
  if (!products.length) return null;
  return (
    <ProductRecommendationRail
      title={string(settings, "heading")}
      products={products}
      basePath={context.basePath}
      currency={context.currency}
      listId={`cms-${context.page.slug}-product-rail-${section.id}`}
      listName={string(settings, "heading")}
    />
  );
}

async function shopRail(
  section: CmsSection,
  { basePath, locale, page }: Context,
) {
  const { settings } = section;
  const source = string(settings, "source");
  const client = getClient();
  let sellers: Seller[];
  if (source === "manual") {
    const selected = ids(settings, "manual_seller_ids");
    const fetched = (await client.sellers.list({ id_in: selected, limit: 24 }))
      .data;
    const byId = new Map(fetched.map((seller) => [seller.id, seller]));
    sellers = selected.flatMap((id) => byId.get(id) || []);
  } else {
    sellers = (await client.sellers.list({ limit: 24 })).data;
    if (source === "highest_rated")
      sellers.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    else if (source === "most_followed")
      sellers.sort((a, b) => b.followers_count - a.followers_count);
    else sellers.sort((a, b) => b.reviews_count - a.reviews_count);
  }
  if (!sellers.length) return null;
  return (
    <MarketplaceSection
      className="py-[var(--cms-section-spacing)]"
      data-list-id={`cms-${page.slug}-shop-rail-${section.id}`}
    >
      <MarketplacePage>
        <MarketplaceSectionHeader title={string(settings, "heading")} />
        <MarketplaceRail>
          {sellers.slice(0, limit(section)).map((seller) => (
            <div key={seller.id} className="w-64 shrink-0">
              <ShopCard seller={seller} basePath={basePath} locale={locale} />
            </div>
          ))}
        </MarketplaceRail>
      </MarketplacePage>
    </MarketplaceSection>
  );
}

async function editorial(section: CmsSection, { basePath }: Context) {
  const { settings } = section;
  const image = string(settings, "image_url");
  const link = safeLink(string(settings, "button_link"), basePath);
  return (
    <MarketplaceSection
      surface="warm"
      className="py-[var(--cms-section-spacing)]"
    >
      <MarketplacePage className="grid items-center gap-8 bg-marketplace-surface-warm md:grid-cols-2">
        {image && (
          <img
            src={image}
            alt=""
            className={`aspect-[4/3] w-full object-cover ${string(settings, "image_position") === "right" ? "md:order-last" : ""}`}
          />
        )}
        <div className="py-8">
          {string(settings, "eyebrow") && (
            <p className="text-xs uppercase tracking-widest text-marketplace-brand">
              {string(settings, "eyebrow")}
            </p>
          )}
          <h2 className="mt-3 font-display text-3xl text-marketplace-brand">
            {string(settings, "heading")}
          </h2>
          {string(settings, "body") && (
            <p className="mt-4 whitespace-pre-line text-marketplace-muted-foreground">
              {string(settings, "body")}
            </p>
          )}
          {link && string(settings, "button_text") && (
            <Link
              href={link}
              className="mt-6 inline-block border-b border-marketplace-brand text-marketplace-brand"
            >
              {string(settings, "button_text")}
            </Link>
          )}
        </div>
      </MarketplacePage>
    </MarketplaceSection>
  );
}

async function richText(section: CmsSection) {
  const blocks = Array.isArray(section.settings.blocks)
    ? section.settings.blocks
    : [];
  return (
    <MarketplaceSection className="py-[var(--cms-section-spacing)]">
      <MarketplacePage className="max-w-3xl">
        {blocks.map((block, index) => {
          if (
            !block ||
            typeof block !== "object" ||
            !("text" in block) ||
            typeof block.text !== "string"
          )
            return null;
          return block.type === "heading" ? (
            <h2 key={index} className="mt-6 text-2xl font-semibold">
              {block.text}
            </h2>
          ) : (
            <p
              key={index}
              className="mt-4 whitespace-pre-line text-marketplace-foreground"
            >
              {block.text}
            </p>
          );
        })}
      </MarketplacePage>
    </MarketplaceSection>
  );
}

async function trust(section: CmsSection) {
  return (
    <MarketplaceSection className="py-[var(--cms-section-spacing)]">
      <MarketplacePage className="border-t border-marketplace-border-subtle text-center">
        <h2 className="font-display text-2xl text-marketplace-brand">
          {string(section.settings, "heading")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-marketplace-muted-foreground">
          {string(section.settings, "body")}
        </p>
      </MarketplacePage>
    </MarketplaceSection>
  );
}

export const sectionRegistry: Record<string, Renderer> = {
  hero,
  category_tiles: (section, context) => tiles(section, context, "category"),
  collection_tiles: (section, context) => tiles(section, context, "collection"),
  product_rail: productRail,
  shop_rail: shopRail,
  editorial,
  rich_text: richText,
  trust,
};

export async function CmsPageRenderer({
  page,
  basePath,
  locale,
  currency,
}: Context) {
  const context = { page, basePath, locale, currency };
  const theme = await getClient()
    .request<{ data: CmsTheme }>("GET", "/theme")
    .then((response) => response.data)
    .catch(() => null);
  const colorVariables: Record<string, string> = {
    brand: "--marketplace-brand",
    background: "--marketplace-background",
    surface: "--marketplace-surface",
    surface_warm: "--marketplace-surface-warm",
    foreground: "--marketplace-foreground",
    muted: "--marketplace-muted-foreground",
    border: "--marketplace-border",
    accent: "--marketplace-accent",
    sale: "--marketplace-sale",
    success: "--marketplace-success",
    danger: "--marketplace-danger",
  };
  const style = Object.fromEntries(
    Object.entries(theme?.settings.colors || {})
      .filter(
        ([key, value]) =>
          key !== "background" &&
          colorVariables[key] &&
          /^#[0-9a-fA-F]{6}$/.test(value),
      )
      .map(([key, value]) => [colorVariables[key], value]),
  );
  const radii: Record<string, string> = {
    none: "0",
    small: "0.25rem",
    medium: "0.5rem",
    large: "0.75rem",
  };
  for (const key of ["radius_sm", "radius_md", "radius_lg"]) {
    const value = theme?.settings.shape?.[key];
    if (value && radii[value])
      style[`--marketplace-${key.replace("_", "-")}`] = radii[value];
  }
  const spacing: Record<string, string> = {
    compact: "2rem",
    comfortable: "3rem",
    spacious: "5rem",
  };
  style["--cms-section-spacing"] =
    spacing[theme?.settings.layout?.section_spacing || "comfortable"] ||
    spacing.comfortable;
  const pageWidth = theme?.settings.layout?.page_width;
  const pageWidths: Record<string, string> = {
    narrow: "1080px",
    standard: "1200px",
    wide: "1440px",
  };
  style.maxWidth =
    pageWidth === "full" ? "none" : pageWidths[pageWidth || ""] || "1440px";
  return (
    <main data-cms-page-id={page.id} style={style} className="mx-auto">
      {
        await Promise.all(
          page.sections.map(async (section) => {
            if (
              !section.enabled ||
              (!sectionRegistry[section.type] &&
                !isMarketplaceSectionType(section.type))
            )
              return null;
            const visibility = section.visibility;
            const deviceClasses = visibility
              ? `${visibility.mobile === false ? "hidden" : "block"} ${visibility.tablet === false ? "md:hidden" : "md:block"} ${visibility.desktop === false ? "lg:hidden" : "lg:block"}`
              : "";
            return (
              <div
                id={`cms-${section.id}`}
                data-cms-section-id={section.id}
                className={deviceClasses}
                key={section.id}
              >
                {
                  await (sectionRegistry[section.type]
                    ? sectionRegistry[section.type](section, context)
                    : renderMarketplaceSection(
                        section as MarketplaceSectionWire,
                        {
                          kind: "page",
                          pageId: page.id,
                          pageSlug: page.slug,
                          pageName: page.name,
                          page,
                          basePath,
                          locale,
                          country:
                            basePath
                              .split("/")
                              .filter(Boolean)[0]
                              ?.toLowerCase() || "us",
                          currency,
                        } satisfies ThemeRenderContext,
                      ))
                }
              </div>
            );
          }),
        )
      }
    </main>
  );
}
