import type { LineItem } from "@spree/sdk";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CartLineItems } from "./CartLineItems";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ refreshCart: vi.fn() }),
}));

it("names the product thumbnail link when the image is missing", () => {
  const item = {
    id: "li_mug",
    slug: "ceramic-mug",
    name: "Ceramic mug",
    quantity: 1,
    display_price: "$24.00",
    thumbnail_url: null,
  } as LineItem;

  render(
    <CartLineItems
      items={[item]}
      basePath="/us/en"
      onRemove={vi.fn()}
      onUpdateQuantity={vi.fn()}
    />,
  );

  const links = screen.getAllByRole("link", { name: item.name });
  expect(links).toHaveLength(2);
  for (const link of links) {
    expect(link).toHaveAttribute("href", "/us/en/products/ceramic-mug");
  }
});
