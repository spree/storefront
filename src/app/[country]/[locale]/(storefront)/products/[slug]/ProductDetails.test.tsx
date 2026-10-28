import type { Product } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PRODUCT_PAGE_EXPAND } from "@/lib/data/cached";
import { ProductDetails } from "./ProductDetails";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/components/products/MediaGallery", () => ({
  MediaGallery: () => null,
}));

vi.mock("@/components/products/ProductCustomFields", () => ({
  ProductCustomFields: () => null,
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

const hiddenPricing = vi.hoisted(() => ({
  value: null as { signInHref: string } | null,
}));

vi.mock("@/contexts/HiddenPricingContext", () => ({
  useHiddenPricing: () => hiddenPricing.value,
}));

vi.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ currency: "USD" }),
}));

vi.mock("@/lib/analytics/gtm", () => ({
  trackAddToCart: vi.fn(),
  trackViewItem: vi.fn(),
}));

const productWithoutCustomVariants = {
  id: "product-1",
  name: "Single Variant Product",
  slug: "single-variant-product",
  default_variant_id: "variant-master",
  default_variant: {
    id: "variant-master",
    product_id: "product-1",
    sku: "MASTER-SKU-001",
    options_text: "",
    purchasable: true,
    in_stock: true,
    price: {
      amount: "25.00",
      currency: "USD",
      compare_at_amount: null,
    },
    original_price: null,
  },
  variants: [],
  option_types: [],
  media: [],
  purchasable: true,
  in_stock: true,
  price: {
    amount: "25.00",
    currency: "USD",
    compare_at_amount: null,
  },
  original_price: null,
  description_html: null,
  custom_fields: [],
} as unknown as Product;

describe("ProductDetails", () => {
  it("requests the default variant for the product page", () => {
    expect(PRODUCT_PAGE_EXPAND).toContain("default_variant");
  });

  it("shows the master SKU when a product has no custom variants", () => {
    render(
      <ProductDetails
        product={productWithoutCustomVariants}
        basePath="/us/en"
      />,
    );

    expect(screen.getByText("sku")).toBeInTheDocument();
    expect(screen.getByText("MASTER-SKU-001")).toBeInTheDocument();
  });

  // Stock with no price cannot be bought, so the status agrees with the button.
  it("shows out of stock for a product in stock that cannot be bought", () => {
    render(
      <ProductDetails
        product={{ ...productWithoutCustomVariants, purchasable: false }}
        basePath="/us/en"
      />,
    );

    expect(screen.getAllByText("outOfStock")).toHaveLength(2);
    expect(screen.queryByText("inStock")).not.toBeInTheDocument();
  });

  it("reads the selected variant, not the product, when there are variants", () => {
    const unbuyable = {
      ...productWithoutCustomVariants.default_variant,
      purchasable: false,
      in_stock: true,
    };

    render(
      <ProductDetails
        product={
          {
            ...productWithoutCustomVariants,
            default_variant: unbuyable,
            variants: [unbuyable],
          } as Product
        }
        basePath="/us/en"
      />,
    );

    expect(screen.getAllByText("outOfStock")).toHaveLength(2);
    expect(screen.queryByText("inStock")).not.toBeInTheDocument();
  });

  // A guest who must sign in to see prices has no cart button to agree with.
  it("shows in stock to a guest on a store that hides prices", () => {
    hiddenPricing.value = { signInHref: "/us/en/account" };

    try {
      render(
        <ProductDetails
          product={{ ...productWithoutCustomVariants, purchasable: false }}
          basePath="/us/en"
        />,
      );

      expect(screen.getByText("inStock")).toBeInTheDocument();
    } finally {
      hiddenPricing.value = null;
    }
  });
});
