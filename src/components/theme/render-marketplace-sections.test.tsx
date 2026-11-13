import type { StoreMerchandisingPlacement } from "@spree/sdk";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/products/ProductCarousel", () => ({
  ProductCarousel: ({ products }: { products: Array<{ id: string }> }) => (
    <div data-product-ids={products.map((product) => product.id).join(",")} />
  ),
}));
vi.mock("@/components/products/FeaturedCollectionProductCard", () => ({
  FeaturedCollectionProductCard: () => (
    <div data-testid="featured-product-card" />
  ),
}));
vi.mock("@/components/products/FeaturedCollectionNavigation", () => ({
  FeaturedCollectionNavigation: () => <div data-testid="featured-navigation" />,
}));
vi.mock("@/components/products/ProductGrid", () => ({
  ProductGrid: ({ products }: { products: Array<{ id: string }> }) => (
    <div data-product-ids={products.map((product) => product.id).join(",")} />
  ),
}));
vi.mock("@/components/shops/ShopCard", () => ({
  ShopCard: ({ className }: { className?: string }) => (
    <div data-testid="shop-card" className={className} />
  ),
}));
vi.mock("@/components/theme/ProductsTabs", () => ({
  ProductsTabs: () => <div data-testid="products-tabs" />,
}));
vi.mock("@/components/theme/VideoPopup", () => ({
  VideoPopup: () => <div data-testid="video-popup" />,
}));
vi.mock("@/components/theme/SandboxedThemeCode", () => ({
  SandboxedThemeCode: ({ code }: { code: string }) => (
    <div data-testid="sandboxed-theme-code">{code}</div>
  ),
}));
vi.mock("@/lib/spree", () => ({
  getClient: vi.fn(() => {
    const product = {
      id: "prod_featured",
      name: "Featured product",
      permalink: "featured-product",
      thumbnail_url: "https://cdn.example.test/product.jpg",
      price: { display_amount: "$12.00" },
      seller: { id: "seller_1", name: "Maker", slug: "maker" },
    };
    const collection = {
      id: "col_seasonal",
      name: "Seasonal collection",
      permalink: "seasonal",
      products_count: 6,
      description: "Seasonal gifts",
      image_url: "https://cdn.example.test/collection.jpg",
    };
    const category = {
      id: "cat_gifts",
      name: "Gifts",
      permalink: "gifts",
      image_url: "https://cdn.example.test/category.jpg",
    };
    const seller = { id: "seller_1", name: "Maker", slug: "maker" };
    return {
      products: { list: async () => ({ data: [product] }) },
      collections: {
        list: async () => ({ data: [collection] }),
        get: async () => collection,
        products: { list: async () => ({ data: [product] }) },
      },
      categories: { list: async () => ({ data: [category] }) },
      sellers: { list: async () => ({ data: [seller] }) },
      request: async () => ({
        data: [
          {
            id: "page_article",
            name: "Maker story",
            slug: "maker-story",
            seo: { description: "A story from our makers." },
          },
        ],
      }),
    };
  }),
  getLocaleOptions: async () => ({}),
}));
vi.mock("@/lib/spree/marketplace", () => ({
  marketplaceFor: () => ({
    recommendations: {
      trending: async () => ({ data: [{ id: "prod_featured" }] }),
      new: async () => ({ data: [{ id: "prod_featured" }] }),
    },
  }),
}));

import { getClient } from "@/lib/spree";
import {
  isMarketplaceSectionType,
  renderMarketplaceSection,
} from "./render-marketplace-sections";

const context = {
  kind: "home" as const,
  basePath: "/us/en",
  locale: "en",
  country: "US",
  placements: [
    {
      id: "mplc_featured",
      surface: "homepage",
      kind: "product_rail",
      title: "Handpicked gifts",
      body: null,
      cta_label: null,
      cta_url: null,
      position: 0,
      exclusive: false,
      campaign_id: "mcamp_summer",
      campaign_name: "Summer gifts",
      campaign_title: "Summer gifts",
      heading: "Handpicked gifts",
      image_url: null,
      mobile_image_url: null,
      collection_id: null,
      category_id: null,
      products: [{ id: "prod_featured" }],
      sellers: [],
    },
    {
      id: "mplc_collections",
      surface: "homepage",
      kind: "collection_tiles",
      title: "Seasonal finds",
      body: null,
      cta_label: null,
      cta_url: null,
      position: 1,
      exclusive: false,
      campaign_id: "mcamp_summer",
      campaign_name: "Summer gifts",
      campaign_title: "Summer gifts",
      heading: "Seasonal finds",
      image_url: "https://cdn.example.test/seasonal.jpg",
      mobile_image_url: null,
      collection_id: "col_seasonal",
      category_id: null,
      collection: {
        id: "col_seasonal",
        name: "Seasonal collection",
        permalink: "seasonal",
        image_url: null,
      },
      products: [],
      sellers: [],
    },
  ] as unknown as StoreMerchandisingPlacement[],
};

const avoneSectionTypes = [
  "products_rows",
  "text",
  "slideshow",
  "slideshow_split",
  "video",
  "banners",
  "featured_product",
  "products_carousel",
  "products_listing",
  "products_tabs",
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
] as const;

const populatedSettings: Record<string, unknown> = {
  heading: "Catalog smoke test",
  body: "A section with content",
  eyebrow: "Made by makers",
  source: "all",
  layout: "grid",
  limit: 4,
  product_count: 4,
  columns: 3,
  category_ids: ["cat_gifts"],
  collection_ids: ["col_seasonal"],
  collection_id: "col_seasonal",
  product_ids: ["prod_featured"],
  manual_product_ids: ["prod_featured"],
  manual_seller_ids: ["seller_1"],
  seller_ids: ["seller_1"],
  image_url: "https://cdn.example.test/section.jpg",
  secondary_image_url: "https://cdn.example.test/section-detail.jpg",
  image_urls: ["https://cdn.example.test/section.jpg"],
  slide_image_urls: ["https://cdn.example.test/slide.jpg"],
  before_image_url: "https://cdn.example.test/before.jpg",
  after_image_url: "https://cdn.example.test/after.jpg",
  video_url: "https://cdn.example.test/section.mp4",
  video_source: "https://cdn.example.test/section.mp4",
  end_at: "2099-01-01T00:00",
  items: "Maker story|Thoughtfully made products",
  messages: "Free shipping over $50",
  code: "<div>Custom section content</div>",
  address: "123 Market Street",
  map_url: "https://www.google.com/maps/embed?pb=example",
  button_text: "Shop now",
  button_link: "/products",
  image_position: "right",
};

describe("Avone section catalog storefront coverage", () => {
  it.each(avoneSectionTypes)("renders the %s section", async (type) => {
    expect(isMarketplaceSectionType(type)).toBe(true);
    const section = await renderMarketplaceSection(
      {
        id: `smoke-${type}`,
        type,
        settings: populatedSettings,
      },
      context,
    );
    expect(section, `${type} should render populated settings`).not.toBeNull();
    const html = renderToStaticMarkup(section);
    expect(html).not.toBe("");
    if (type === "divider") expect(html).toContain("border-top:1px solid");
    else
      expect(
        html,
        `${type} should apply its section layout settings`,
      ).toContain(`data-theme-section-frame="smoke-${type}"`);
  });

  it("renders collection block overrides and the gradient card style", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "collection-gradient",
        type: "collection_gradient_overlay",
        settings: {
          source: "all",
          heading: "Seasonal picks",
          columns_desktop: 4,
          image_zoom_on_hover: true,
        },
        blocks: {
          collection: {
            type: "collection_card",
            settings: {
              collection_id: "col_seasonal",
              card_image_url: "https://cdn.example.test/custom-collection.jpg",
              title: "Curated summer",
              description: "Made for sunny days",
              button_label: "Explore",
              link: "/us/en/collections/summer-edit",
            },
          },
        },
        blockOrder: ["collection"],
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toContain("Seasonal picks");
    expect(html).toContain("Curated summer");
    expect(html).toContain("Made for sunny days");
    expect(html).toContain("Explore");
    expect(html).toContain("custom-collection.jpg");
    expect(html).toContain("/us/en/collections/summer-edit");
  });

  it("keeps carousel layout enabled for a collection list", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "collection-list-carousel",
        type: "collections_list",
        settings: {
          source: "all",
          heading: "Browse collections",
          layout: "carousel",
        },
      },
      context,
    );

    expect(renderToStaticMarkup(section)).toContain("data-theme-carousel");
  });

  it.each([
    ["collection", "collection_id", "in_collection"],
    ["category", "category_id", "in_category"],
  ])("filters a Products section by its selected %s", async (source, setting, filter) => {
    const originalClient = getClient();
    const productsList = vi.fn(async () => ({
      data: [
        {
          id: "prod_featured",
          name: "Featured product",
          permalink: "featured-product",
          thumbnail_url: "https://cdn.example.test/product.jpg",
          price: { display_amount: "$12.00" },
          seller: { id: "seller_1", name: "Maker", slug: "maker" },
        },
      ],
    }));
    vi.mocked(getClient).mockReturnValue({
      products: { list: productsList },
    } as never);

    const section = await renderMarketplaceSection(
      {
        id: `products-${source}`,
        type: "products_rows",
        settings: {
          source,
          [setting]: source === "collection" ? "col_seasonal" : "cat_gifts",
          product_count: 4,
        },
      },
      context,
    );

    expect(renderToStaticMarkup(section)).toContain("prod_featured");
    expect(productsList).toHaveBeenCalledWith(
      expect.objectContaining({
        [filter]: source === "collection" ? "col_seasonal" : "cat_gifts",
      }),
      expect.anything(),
    );
    vi.mocked(getClient).mockReturnValue(originalClient);
  });

  it("uses category-card overrides and only renders carousel controls when enabled", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "category-carousel",
        type: "category_tiles",
        settings: {
          source: "all",
          heading: "Shop by category",
          carousel: true,
          display_style: "text_hover",
          show_arrows_desktop: true,
          show_pagination_mobile: true,
        },
        blocks: {
          category: {
            type: "category_card",
            settings: {
              category_id: "cat_gifts",
              title: "Gift ideas",
              card_image_url: "https://cdn.example.test/gift-ideas.jpg",
              link: "/us/en/c/gifts",
            },
          },
        },
        blockOrder: ["category"],
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toMatch(/data-theme-carousel(?:="(?:true)?")?/);
    expect(html).toContain("Gift ideas");
    expect(html).toContain("gift-ideas.jpg");
    expect(html).toContain("group-hover:opacity-100");
    expect(html).toContain("Next collections");
    expect(html).toContain("collection-theme-swiper { overflow:hidden;");
  });

  it("renders an intentional monogram tile when a category has no image", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "category-no-image",
        type: "category_tiles",
        settings: { source: "all", display_style: "text_below" },
        blocks: {
          card: {
            type: "category_card",
            settings: {
              title: "[dev-dataset] Merch Fixtures",
              category_id: "cat_fixtures",
            },
          },
        },
        blockOrder: ["card"],
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toContain("background-color:#f2e8df");
    expect(html).toContain(">MF</span>");
    expect(html).not.toContain('name="categories"');
  });

  it.each([
    {
      kind: "collection" as const,
      sectionType: "collection_text_below",
      blockType: "collection_card",
      cardTitle: "Custom collection card",
      imageUrl: "https://cdn.example.test/custom-collection-card.jpg",
      link: "/us/en/collections/custom",
    },
    {
      kind: "category" as const,
      sectionType: "category_tiles",
      blockType: "category_card",
      cardTitle: "Custom category card",
      imageUrl: "https://cdn.example.test/custom-category-card.jpg",
      link: "/us/en/c/custom",
    },
  ])("renders a configured $kind card before an entity is selected", async (fixture) => {
    const section = await renderMarketplaceSection(
      {
        id: `unbound-${fixture.kind}-card`,
        type: fixture.sectionType,
        settings: { source: "all", display_style: "text_below" },
        blocks: {
          card: {
            type: fixture.blockType,
            settings: {
              title: fixture.cardTitle,
              description: "Custom card description",
              button_label: "Explore",
              card_image_url: fixture.imageUrl,
              link: fixture.link,
            },
          },
        },
        blockOrder: ["card"],
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toContain(fixture.cardTitle);
    expect(html).toContain("Custom card description");
    expect(html).toContain("Explore");
    expect(html).toContain(fixture.imageUrl);
    expect(html).toContain(fixture.link);
  });

  it("applies Custom code section layout and appearance settings", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "custom-code",
        type: "custom_liquid",
        settings: {
          code: "<p>Custom content</p>",
          width: "full",
          background_color: "#123456",
          padding_top: 56,
          padding_bottom: 24,
        },
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toContain('data-theme-section-frame="custom-code"');
    expect(html).toContain("max-w-none");
    expect(html).toContain(
      "padding-top:calc(56px * var(--cms-section-spacing-scale, 1))",
    );
    expect(html).toContain("background-color:#123456");
  });
});

describe("homepage merchandising section sources", () => {
  it("renders nested Group block content inside its owning content section", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "grouped-content",
        type: "custom_content",
        settings: { width: "page" },
        blocks: {
          group: {
            type: "group",
            settings: { direction: "vertical", gap: 12 },
          },
          heading: {
            type: "heading",
            parent_id: "group",
            settings: { text: "Maker picks", level: "h2" },
          },
          text: {
            type: "text",
            parent_id: "group",
            settings: { text: "Chosen by independent sellers." },
          },
        },
        blockOrder: ["group", "heading", "text"],
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    const groupStart = html.indexOf('data-theme-block-id="group"');
    const headingIndex = html.indexOf("Maker picks");
    const textIndex = html.indexOf("Chosen by independent sellers.");

    expect(groupStart).toBeGreaterThanOrEqual(0);
    expect(headingIndex).toBeGreaterThan(groupStart);
    expect(textIndex).toBeGreaterThan(headingIndex);
  });

  it("renders editable blocks alongside a product rail", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "featured-products",
        type: "product_rail",
        settings: {
          source: "placement",
          merchandising_placement_id: "mplc_featured",
          layout: "carousel",
          limit: 8,
        },
        blocks: {
          heading: { type: "heading", settings: { text: "Editor heading" } },
        },
        blockOrder: ["heading"],
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toContain("Editor heading");
    expect(html).toContain('data-product-ids="prod_featured"');
    expect(html).toContain('data-theme-section-frame="featured-products"');
    expect(html).toContain("data-theme-section-content");
  });

  it("renders products from the selected campaign placement", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "featured-products",
        type: "product_rail",
        settings: {
          heading: "Popular gifts",
          source: "placement",
          merchandising_placement_id: "mplc_featured",
          layout: "carousel",
          limit: 8,
        },
      },
      context,
    );

    expect(renderToStaticMarkup(section)).toContain(
      'data-product-ids="prod_featured"',
    );
  });

  it("omits the optional shop rail when its seller request is aborted", async () => {
    const originalClient = getClient();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(getClient).mockReturnValue({
      sellers: {
        list: async () => {
          throw new DOMException("The operation was aborted", "AbortError");
        },
      },
    } as never);

    try {
      const section = await renderMarketplaceSection(
        {
          id: "popular-shops",
          type: "shop_rail",
          settings: { heading: "Popular shops", source: "popular", limit: 4 },
        },
        context,
      );

      expect(section).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        "[theme] Shop rail popular-shops timed out; omitting section.",
      );
    } finally {
      vi.mocked(getClient).mockReturnValue(originalClient);
      warn.mockRestore();
    }
  });

  it("renders shop cards in a navigable carousel", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "popular-shops-widths",
        type: "shop_rail",
        settings: { heading: "Popular shops", source: "popular", limit: 4 },
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toContain("data-theme-carousel");
    expect(html).toContain("Next shops");
    expect(html).toContain("h-full w-full");
  });

  it("renders the selected collection placement with its campaign image", async () => {
    const section = await renderMarketplaceSection(
      {
        id: "featured-collections",
        type: "collection_tiles",
        settings: {
          heading: "Featured collections",
          source: "placement",
          merchandising_placement_id: "mplc_collections",
          layout: "grid",
        },
      },
      context,
    );

    const html = renderToStaticMarkup(section);
    expect(html).toContain('href="/us/en/collections/seasonal"');
    expect(html).toContain("Seasonal finds");
    expect(html).toContain("https://cdn.example.test/seasonal.jpg");
  });

  it("falls back to live collection data when the saved placement no longer exists", async () => {
    const client = {
      collections: {
        list: async () => ({
          data: [
            {
              id: "col_live",
              name: "Live collection",
              permalink: "live",
              image_url: null,
            },
          ],
        }),
      },
    };
    const { getClient } = await import("@/lib/spree");
    vi.mocked(getClient).mockReturnValue(client as never);

    const section = await renderMarketplaceSection(
      {
        id: "featured-collections",
        type: "collection_tiles",
        settings: {
          heading: "Featured collections",
          source: "placement",
          merchandising_placement_id: "mplc_removed",
          layout: "grid",
        },
      },
      { ...context, placements: [] },
    );

    expect(renderToStaticMarkup(section)).toContain("Live collection");
  });
});
