import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/theme/render-resource-sections", () => ({
  renderResourceSection: async (
    section: { section_type: string },
    _context: unknown,
    _theme: unknown,
    state: { embeddedProductReview?: { settings: { sort?: string } } },
  ) =>
    section.section_type === "product" ? (
      <div
        data-main
        data-review-sort={state.embeddedProductReview?.settings.sort}
      />
    ) : section.section_type === "product_reviews" ? (
      <div data-separate-reviews />
    ) : section.section_type === "product_details" ? (
      <div data-separate-details />
    ) : null,
}));
vi.mock("@/components/theme/render-marketplace-sections", () => ({
  isMarketplaceSectionType: () => false,
  renderMarketplaceSection: () => null,
}));

import { ThemeTemplateRenderer } from "./ThemeTemplateRenderer";

const context = {
  kind: "product",
  product: { id: "p" },
  basePath: "/us/en",
  locale: "en",
  country: "US",
} as never;
const template = {
  order: ["main", "reviews"],
  sections: {
    main: { type: "product", settings: {}, blocks: {}, block_order: [] },
    reviews: {
      type: "product_reviews",
      settings: { sort: "highest" },
      blocks: {},
      block_order: [],
    },
  },
} as never;

describe("product review placement", () => {
  it("passes the configured reviews to the product and omits the separate copy", async () => {
    const html = renderToStaticMarkup(
      await ThemeTemplateRenderer({ data: template, context }),
    );
    expect(html).toContain('data-review-sort="highest"');
    expect(html).not.toContain("data-separate-reviews");
  });

  it("keeps review sections separate in the theme editor", async () => {
    const html = renderToStaticMarkup(
      await ThemeTemplateRenderer({
        data: template,
        context,
        editorMode: true,
      }),
    );
    expect(html).toContain("data-separate-reviews");
    expect(html).not.toContain('data-review-sort="highest"');
  });

  it("omits the standalone details section on the product page", async () => {
    const withDetails = {
      order: ["main", "details"],
      sections: {
        main: { type: "product", settings: {}, blocks: {}, block_order: [] },
        details: {
          type: "product_details",
          settings: {},
          blocks: {},
          block_order: [],
        },
      },
    } as never;
    const html = renderToStaticMarkup(
      await ThemeTemplateRenderer({ data: withDetails, context }),
    );
    expect(html).not.toContain("data-separate-details");
    const editorHtml = renderToStaticMarkup(
      await ThemeTemplateRenderer({
        data: withDetails,
        context,
        editorMode: true,
      }),
    );
    expect(editorHtml).toContain("data-separate-details");
  });
});
