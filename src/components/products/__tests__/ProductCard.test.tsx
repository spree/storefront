import type { StoreProduct } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "@/components/products/ProductCard";

vi.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ currency: "USD", locale: "en", loading: false }),
}));

// Minimal product fixtures — cast to StoreProduct for component props
const baseProduct = {
  id: "prod-1",
  name: "Classic T-Shirt",
  slug: "classic-t-shirt",
  purchasable: true,
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
} as unknown as StoreProduct;

const saleProduct = {
  id: "prod-2",
  name: "Sale T-Shirt",
  slug: "sale-t-shirt",
  purchasable: true,
  thumbnail_url: "https://example.com/shirt.jpg",
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
} as unknown as StoreProduct;

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
} as unknown as StoreProduct;

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
} as unknown as StoreProduct;

describe("ProductCard", () => {
  it("renders product name and price", () => {
    render(<ProductCard product={baseProduct} basePath="/us/en" />);

    expect(screen.getByText("Classic T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("links to the product page", () => {
    render(<ProductCard product={baseProduct} basePath="/us/en" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/us/en/products/classic-t-shirt");
  });

  it("shows Sale badge when on sale", () => {
    render(<ProductCard product={saleProduct} basePath="/us/en" />);

    expect(screen.getByText("Sale")).toBeInTheDocument();
  });

  it("shows strikethrough price when on sale", () => {
    render(<ProductCard product={saleProduct} basePath="/us/en" />);

    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    const strikethrough = screen.getByText("$25.00");
    expect(strikethrough).toHaveClass("line-through");
  });

  it("does not show Sale badge for regular price products", () => {
    render(<ProductCard product={baseProduct} basePath="/us/en" />);

    expect(screen.queryByText("Sale")).not.toBeInTheDocument();
  });

  it("shows Out of Stock for non-purchasable products", () => {
    render(<ProductCard product={outOfStockProduct} basePath="/us/en" />);

    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("renders image when thumbnail_url is provided", () => {
    render(<ProductCard product={baseProduct} basePath="/us/en" />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/shirt.jpg");
    expect(img).toHaveAttribute("alt", "Classic T-Shirt");
  });

  it("renders placeholder when no thumbnail", () => {
    render(<ProductCard product={noImageProduct} basePath="/us/en" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("uses empty basePath by default", () => {
    render(<ProductCard product={baseProduct} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/products/classic-t-shirt");
  });
});
