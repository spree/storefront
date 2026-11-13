import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "@/app/[country]/[locale]/(storefront)/products/[slug]/ProductDetails",
  () => ({
    ProductDetails: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="product-details">{children}</div>
    ),
  }),
);
vi.mock("@/components/navigation/Breadcrumbs", () => ({
  Breadcrumbs: () => null,
}));
vi.mock("@/components/reviews/ProductReviewsSection", () => ({
  ProductReviewsSection: () => <div data-legacy-lower="reviews" />,
}));
vi.mock("@/components/products/ProductPageRecommendations", () => ({
  ProductPageRecommendations: () => <div data-legacy-lower="recommendations" />,
}));
vi.mock("@/components/products/RecentlyViewedProducts", () => ({
  RecentlyViewedProducts: () => <div data-legacy-lower="recently-viewed" />,
}));

import { ProductThemeBody } from "./ProductThemeBody";

describe("ProductThemeBody template ownership", () => {
  const context = {
    kind: "product",
    product: { id: "prod_1", name: "Handmade bowl" },
    basePath: "/us/en",
    locale: "en",
  } as never;

  it("shows reviews when a document-driven template has no reviews section", async () => {
    const html = renderToStaticMarkup(
      await ProductThemeBody({ context, documentDriven: true }),
    );
    expect(html).toContain('data-testid="product-details"');
    expect(html).toContain('data-legacy-lower="reviews"');
    expect(html).not.toContain('data-legacy-lower="recommendations"');
  });

  it("does not duplicate reviews when the document already has a reviews section", async () => {
    const html = renderToStaticMarkup(
      await ProductThemeBody({
        context,
        documentDriven: true,
        productReviewsSectionPresent: true,
      }),
    );
    expect(html).not.toContain('data-legacy-lower="reviews"');
  });

  it("places configured reviews inside the product details when supplied", async () => {
    const html = renderToStaticMarkup(
      await ProductThemeBody({
        context,
        documentDriven: true,
        productReviewsSectionPresent: true,
        embeddedReviews: <div data-configured-reviews="true" />,
      }),
    );
    expect(html).toContain(
      '<div data-testid="product-details"><div data-configured-reviews="true"></div></div>',
    );
    expect(html).not.toContain('data-legacy-lower="reviews"');
  });

  it("keeps lower-section fallback for legacy product templates", async () => {
    const html = renderToStaticMarkup(
      await ProductThemeBody({
        context,
        documentDriven: false,
        themeSettings: { product_page: { show_recently_viewed: true } },
      }),
    );
    // Reviews sit under the gallery inside ProductDetails on the classic path.
    expect(html).toContain('data-testid="product-details"');
    expect(html).toContain('data-legacy-lower="reviews"');
    expect(html).toContain('data-legacy-lower="recommendations"');
    expect(html).toContain('data-legacy-lower="recently-viewed"');
  });
});
