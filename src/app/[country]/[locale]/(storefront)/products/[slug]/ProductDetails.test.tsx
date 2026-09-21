import type { Product } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PRODUCT_PAGE_EXPAND } from "@/lib/data/cached";
import { ProductDetails } from "./ProductDetails";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/products/MediaGallery", () => ({
  MediaGallery: () => null,
}));

vi.mock("@/components/products/ProductCustomFields", () => ({
  ProductCustomFields: () => null,
}));

vi.mock("@/components/wishlist/WishlistButton", () => ({
  WishlistButton: () => null,
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ addItem: vi.fn() }),
}));

vi.mock("@/contexts/HiddenPricingContext", () => ({
  useHiddenPricing: () => null,
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
      display_amount: "$25.00",
      amount_in_cents: 2500,
      compare_at_amount_in_cents: null,
      display_compare_at_amount: null,
    },
    original_price: null,
  },
  variants: [],
  option_types: [],
  media: [],
  purchasable: true,
  in_stock: true,
  price: {
    display_amount: "$25.00",
    amount_in_cents: 2500,
    compare_at_amount_in_cents: null,
    display_compare_at_amount: null,
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
});
