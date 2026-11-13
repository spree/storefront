import type { Product } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/products/ProductCard";
import { ThemeSettingsProvider } from "@/contexts/ThemeSettingsContext";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ currency: "USD", locale: "en", loading: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));

vi.mock("@/components/products/FavoriteButton", () => ({
  FavoriteButton: () => null,
}));

vi.mock("@/components/products/FeaturedCollectionQuickAdd", () => ({
  FeaturedCollectionQuickAdd: () => <button type="button">Quick add</button>,
}));

const baseProduct = {
  id: "prod-1",
  name: "Classic T-Shirt",
  slug: "classic-t-shirt",
  purchasable: true,
  thumbnail_url: "https://example.com/shirt.jpg",
  seller_id: "sel_1",
  seller_name: "Oak Studio",
  seller_slug: "oak-studio",
  average_rating: 4.9,
  reviews_count: 128,
  price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
    compare_at_amount_in_cents: null,
    display_compare_at_amount: null,
  },
  original_price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
  },
} as unknown as Product;

const saleProduct = {
  id: "prod-2",
  name: "Sale T-Shirt",
  slug: "sale-t-shirt",
  purchasable: true,
  thumbnail_url: "https://example.com/shirt.jpg",
  seller_id: null,
  seller_name: null,
  seller_slug: null,
  price: {
    display_amount: "$15.00",
    amount_in_cents: 1500,
    compare_at_amount_in_cents: null,
    display_compare_at_amount: null,
  },
  original_price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
  },
} as unknown as Product;

const outOfStockProduct = {
  id: "prod-3",
  name: "Sold Out Item",
  slug: "sold-out-item",
  purchasable: false,
  thumbnail_url: "https://example.com/shirt.jpg",
  price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
    compare_at_amount_in_cents: null,
    display_compare_at_amount: null,
  },
  original_price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
  },
} as unknown as Product;

const noImageProduct = {
  id: "prod-4",
  name: "No Image Product",
  slug: "no-image",
  purchasable: true,
  thumbnail_url: null,
  price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
    compare_at_amount_in_cents: null,
    display_compare_at_amount: null,
  },
  original_price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
  },
} as unknown as Product;

describe("ProductCard", () => {
  it("uses the Star Seller avatar treatment in product cards", () => {
    const starSellerProduct = {
      ...baseProduct,
      seller: {
        id: "sel_1",
        name: "Oak Studio",
        slug: "oak-studio",
        badges: [
          {
            id: "badge_1",
            key: "star_seller",
            label: "Star Seller",
            description: "Consistently excellent service",
            awarded_at: "2026-10-01T00:00:00Z",
          },
        ],
      },
    } as unknown as Product;

    const { container } = render(
      <ThemeSettingsProvider settings={{}}>
        <ProductCard product={starSellerProduct} showFavorite={false} />
      </ThemeSettingsProvider>,
    );

    expect(
      container.querySelector("[data-star-seller-avatar='true']"),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: "Star Seller" })).toBeVisible();
  });

  it("applies global quick-add and currency-format settings", () => {
    render(
      <ThemeSettingsProvider
        settings={{
          products_grid: { show_quick_add: true },
          localization: { currency_format: "with_currency" },
        }}
      >
        <ProductCard
          product={baseProduct}
          basePath="/us/en"
          currency="USD"
          showFavorite={false}
        />
      </ThemeSettingsProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Quick add" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$25.00 USD")).toBeInTheDocument();
  });

  it("renders product name and price", () => {
    render(
      <ProductCard
        product={baseProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(screen.getByText("Classic T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("renders the image-first rail card with gallery dots and an overlaid price", () => {
    const productWithGallery = {
      ...baseProduct,
      media: [
        {
          id: "media-1",
          media_type: "image",
          small_url: "https://example.com/shirt-detail.jpg",
          original_url: "https://example.com/shirt-detail.jpg",
        },
      ],
    } as unknown as Product;
    const { container } = render(
      <ProductCard
        product={productWithGallery}
        basePath="/us/en"
        density="rail"
        showFavorite={false}
      />,
    );

    expect(
      container.querySelector("[data-theme-product-price-pill]"),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('nav[aria-label="galleryPagination"] button'),
    ).toHaveLength(2);
    expect(screen.getByText("Classic T-Shirt")).toBeInTheDocument();
  });

  it("uses the source image ratio when the product grid is set to Adapt", () => {
    const { container } = render(
      <ThemeSettingsProvider
        settings={{ products_grid: { image_ratio: "adapt" } }}
      >
        <ProductCard
          product={baseProduct}
          basePath="/us/en"
          showFavorite={false}
        />
      </ThemeSettingsProvider>,
    );

    const image = container.querySelector(
      '[data-theme-product-card] img[alt="Classic T-Shirt"]',
    );
    expect(image).toHaveAttribute("width", "1200");
    expect(image).toHaveClass("h-auto", "w-full");
    expect(image?.parentElement).not.toHaveClass("aspect-[4/5]");
  });

  it("shows configured product option swatches in the grid", () => {
    const productWithColors = {
      ...baseProduct,
      option_values: [
        {
          id: "red",
          name: "Red",
          label: "Red",
          option_type_name: "color",
          option_type_label: "Color",
          color_code: "#ff0000",
          image_url: null,
        },
        {
          id: "blue",
          name: "Blue",
          label: "Blue",
          option_type_name: "color",
          option_type_label: "Color",
          color_code: "#0000ff",
          image_url: null,
        },
        {
          id: "large",
          name: "Large",
          label: "Large",
          option_type_name: "size",
          option_type_label: "Size",
          color_code: null,
          image_url: null,
        },
      ],
    } as unknown as Product;

    render(
      <ThemeSettingsProvider
        settings={{
          product_swatches: {
            enabled: true,
            option_name: "Color",
            color_style: "color",
            size: "large",
          },
        }}
      >
        <ProductCard
          product={productWithColors}
          basePath="/us/en"
          showFavorite={false}
        />
      </ThemeSettingsProvider>,
    );

    const options = screen.getByRole("list", {
      name: "Available color options",
    });
    expect(options).toBeInTheDocument();
    expect(screen.getByTitle("Red")).toHaveStyle({
      backgroundColor: "rgb(255, 0, 0)",
    });
    expect(screen.getByTitle("Red")).toHaveClass("size-5");
    expect(screen.getByTitle("Blue")).toHaveStyle({
      backgroundColor: "rgb(0, 0, 255)",
    });
    expect(screen.queryByTitle("Large")).not.toBeInTheDocument();
  });

  it("links to the product page", () => {
    render(
      <ProductCard
        product={baseProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    const links = screen.getAllByRole("link", { name: "Classic T-Shirt" });
    expect(links[0]).toHaveAttribute("href", "/us/en/products/classic-t-shirt");
  });

  it("shows seller attribution with shop link", () => {
    render(
      <ProductCard
        product={baseProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    const sellerLink = screen.getByRole("link", { name: "Oak Studio" });
    expect(sellerLink).toHaveAttribute("href", "/us/en/sellers/oak-studio");
  });

  it("keeps seller navigation separate from the product link and puts the seller first", () => {
    const { container } = render(
      <ProductCard
        product={baseProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(container.querySelector("a a, a button")).toBeNull();
    const seller = screen.getByRole("link", { name: "Oak Studio" });
    const product = screen.getAllByRole("link", { name: "Classic T-Shirt" })[0];
    expect(
      seller.compareDocumentPosition(product) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the square default media frame until the theme selects a ratio", () => {
    const { container } = render(
      <ProductCard
        product={baseProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );
    expect(
      container.querySelector(
        "article [class*='marketplace-product-image-ratio']",
      ),
    ).toBeTruthy();
  });

  it("shows a personalizable badge without nesting it inside the product link", () => {
    render(
      <ProductCard
        product={
          {
            ...baseProduct,
            personalization_fields: [{ id: "field_1", name: "Initials" }],
          } as unknown as Product
        }
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(screen.getByText("personalizable")).toBeInTheDocument();
    expect(document.querySelector("a a, a button")).toBeNull();
  });

  it("shows Sale badge when on sale", () => {
    render(
      <ProductCard
        product={saleProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(screen.getByText("sale")).toBeInTheDocument();
  });

  it("shows the highest priority configured merchandising signals", () => {
    const productWithSignals = {
      ...baseProduct,
      merchandising_signals: [
        {
          key: "bestseller",
          label: "Bestseller",
          priority: 80,
          source: "orders",
          presentation: "marketplace_badge",
        },
        {
          key: "low_stock",
          label: "Only a few left",
          priority: 90,
          source: "inventory",
          presentation: "commerce_badge",
        },
      ],
    } as unknown as Product;

    render(
      <ThemeSettingsProvider
        settings={{
          products_grid: {
            show_commerce_badges: true,
            show_marketplace_badges: true,
            max_badges_desktop: "2",
            allowed_commerce_badges: "low_stock",
            allowed_marketplace_badges: "bestseller",
          },
        }}
      >
        <ProductCard
          product={productWithSignals}
          basePath="/us/en"
          showFavorite={false}
        />
      </ThemeSettingsProvider>,
    );

    expect(
      screen.getByRole("list", { name: "productHighlights" }),
    ).toHaveTextContent("Only a few leftBestseller");
  });

  it("shows strikethrough price when on sale", () => {
    render(
      <ProductCard
        product={saleProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    const strikethrough = screen.getByText("$25.00");
    expect(strikethrough).toHaveClass("line-through");
  });

  it("does not show Sale badge for regular price products", () => {
    render(
      <ProductCard
        product={baseProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(screen.queryByText("sale")).not.toBeInTheDocument();
  });

  it("shows Out of Stock for non-purchasable products", () => {
    render(
      <ProductCard
        product={outOfStockProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(screen.getByText("outOfStock")).toBeInTheDocument();
  });

  it("renders image when thumbnail_url is provided", () => {
    render(
      <ProductCard
        product={baseProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/shirt.jpg");
    expect(img).toHaveAttribute("alt", "Classic T-Shirt");
  });

  it("renders placeholder when no thumbnail", () => {
    render(
      <ProductCard
        product={noImageProduct}
        basePath="/us/en"
        showFavorite={false}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("uses empty basePath by default", () => {
    render(<ProductCard product={baseProduct} showFavorite={false} />);

    const links = screen.getAllByRole("link", { name: "Classic T-Shirt" });
    expect(links[0]).toHaveAttribute("href", "/products/classic-t-shirt");
  });
});
