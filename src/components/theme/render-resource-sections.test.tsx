import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SellerStorefrontPayload } from "@/lib/data/seller-storefront-types";

vi.mock("@/components/cms/CmsPageRenderer", () => ({
  CmsPageRenderer: ({
    page,
    basePath,
  }: {
    page: { slug: string };
    basePath: string;
  }) => <div data-cms-page={page.slug} data-base-path={basePath} />,
}));
vi.mock("@/components/shops/seller-storefront/SellerStorefrontHome", () => ({
  SellerStorefrontHome: ({
    slug,
    sellerId,
  }: {
    slug: string;
    sellerId: string;
  }) => <div data-seller-slug={slug} data-seller-id={sellerId} />,
}));
vi.mock("@/components/products/ProductPageRecommendations", () => ({
  ProductPageRecommendations: (props: {
    showRelated?: boolean;
    showRecommended?: boolean;
    relatedHeading?: string;
    recommendedHeading?: string;
    productCount?: number;
  }) => (
    <div
      data-related={props.showRelated ? "true" : "false"}
      data-recommended={props.showRecommended ? "true" : "false"}
      data-related-heading={props.relatedHeading}
      data-recommended-heading={props.recommendedHeading}
      data-count={props.productCount}
    />
  ),
}));
vi.mock("@/components/products/RecentlyViewedProducts", () => ({
  RecentlyViewedProducts: (props: {
    heading?: string;
    productCount?: number;
  }) => (
    <div
      data-recently-viewed-heading={props.heading}
      data-count={props.productCount}
    />
  ),
}));
vi.mock("@/lib/data/collections", () => ({
  getCollection: async (id: string) => ({
    id,
    name: "Seasonal gifts",
    permalink: "seasonal-gifts",
    image_url: "https://cdn.example.test/seasonal.jpg",
    square_image_url: null,
  }),
  getCollectionProducts: vi.fn(),
}));

import { renderResourceSection } from "./render-resource-sections";

describe("resource theme sections", () => {
  it("renders existing CMS page content from the page main section", async () => {
    const page = {
      id: "page_123",
      name: "Our story",
      slug: "our-story",
      page_type: "standard",
      status: "published",
      seo: { title: null, description: null },
      version: 1,
      sections: [],
      published_at: null,
    };
    const node = await renderResourceSection(
      {
        section_id: "page-main",
        section_type: "page_main",
        settings: {},
        blocks: {},
        block_order: [],
      },
      {
        kind: "page",
        pageId: page.id,
        pageSlug: page.slug,
        pageName: page.name,
        page,
        basePath: "/us/en",
        locale: "en",
        country: "US",
      },
    );

    expect(renderToStaticMarkup(node)).toContain(
      'data-cms-page="our-story" data-base-path="/us/en"',
    );
  });

  it("renders the existing seller storefront home from the seller main section", async () => {
    const seller = {
      seller: {
        id: "seller_123",
        slug: "maker-shop",
        name: "Maker Shop",
        about_html: null,
        about: "Made by hand",
        reviews_count: 4,
      },
      sections: [],
      featured_product_ids: [],
      stats: {
        reviews_count: 4,
        average_rating: null,
        followers_count: 0,
        sales_count: 0,
      },
      following: null,
      messaging_available: null,
    } as unknown as SellerStorefrontPayload;
    const node = await renderResourceSection(
      {
        section_id: "seller-main",
        section_type: "seller_main",
        settings: {},
        blocks: {},
        block_order: [],
      },
      {
        kind: "seller",
        sellerSlug: seller.seller.slug,
        seller,
        basePath: "/us/en",
        locale: "en",
        country: "US",
      },
    );

    expect(renderToStaticMarkup(node)).toContain(
      'data-seller-slug="maker-shop" data-seller-id="seller_123"',
    );
  });

  it("renders configurable product recommendation sections", async () => {
    const section = {
      section_id: "recommendations",
      section_type: "related_products",
      settings: { heading: "More from this maker", product_count: 5 },
      blocks: {},
      block_order: [],
    };
    const node = await renderResourceSection(section, {
      kind: "product",
      product: {
        id: "prod_1",
        seller_name: "Maker",
        price: { currency: "USD" },
      } as never,
      basePath: "/us/en",
      locale: "en",
      country: "US",
      currency: "USD",
    });

    expect(renderToStaticMarkup(node)).toContain('data-related="true"');
    expect(renderToStaticMarkup(node)).toContain(
      'data-related-heading="More from this maker"',
    );
    expect(renderToStaticMarkup(node)).toContain('data-count="5"');
  });

  it("renders separate collection banner and breadcrumb sections", async () => {
    const context = {
      kind: "collection" as const,
      collectionId: "col_1",
      collectionName: "Handmade gifts",
      collectionSlug: "handmade-gifts",
      collection: {
        id: "col_1",
        name: "Handmade gifts",
        permalink: "handmade-gifts",
        image_url: "https://cdn.example.test/collection.jpg",
        short_description: "Made by independent creators",
      } as never,
      basePath: "/us/en",
      locale: "en",
      country: "US",
    };
    const banner = await renderResourceSection(
      {
        section_id: "collection-banner",
        section_type: "collection_banner",
        settings: { style: "image", height: "large", show_description: true },
        blocks: {},
        block_order: [],
      },
      context,
    );
    const breadcrumbs = await renderResourceSection(
      {
        section_id: "collection-breadcrumbs",
        section_type: "collection_breadcrumbs",
        settings: { show_home: true },
        blocks: {},
        block_order: [],
      },
      context,
    );

    expect(renderToStaticMarkup(banner)).toContain(
      "Made by independent creators",
    );
    expect(renderToStaticMarkup(banner)).toContain(
      "data-theme-collection-banner-custom",
    );
    expect(renderToStaticMarkup(breadcrumbs)).toContain(
      'href="/us/en/products"',
    );
    expect(renderToStaticMarkup(breadcrumbs)).toContain("Handmade gifts");

    const subcollections = await renderResourceSection(
      {
        section_id: "collection-subcollections",
        section_type: "collection_subcollections",
        settings: {
          heading: "Browse more",
          collection_ids: ["col_2"],
          columns: 3,
        },
        blocks: {},
        block_order: [],
      },
      context,
    );
    expect(renderToStaticMarkup(subcollections)).toContain(
      'href="/us/en/collections/seasonal-gifts"',
    );
    expect(renderToStaticMarkup(subcollections)).toContain("Browse more");
  });
});
