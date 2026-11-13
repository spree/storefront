import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeSettingsProvider } from "@/contexts/ThemeSettingsContext";

vi.mock("next/navigation", () => ({
  usePathname: () => "/storefront-embed/us/en/account/favorites",
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ itemCount: 2, openCart: vi.fn() }),
}));

import { MarketplaceBottomNav } from "./MarketplaceBottomNav";

describe("MarketplaceBottomNav", () => {
  it("renders five canonical tabs and marks the saved destination active", () => {
    render(<MarketplaceBottomNav basePath="/us/en" />);

    const navigation = screen.getByRole("navigation", {
      name: "marketplaceNavigation",
    });
    expect(navigation.firstElementChild?.children).toHaveLength(5);
    expect(within(navigation).getByText("home").closest("a")).toHaveAttribute(
      "href",
      "/us/en",
    );
    expect(
      within(navigation).getByText("navExplore").closest("a"),
    ).toHaveAttribute("href", "/us/en/products");
    expect(
      within(navigation).getByText("navSaved").closest("a"),
    ).toHaveAttribute("aria-current", "page");
    expect(within(navigation).getByText("cart").closest("a")).toHaveAttribute(
      "href",
      "/us/en/cart",
    );
    expect(within(navigation).getByText("navYou").closest("a")).toHaveAttribute(
      "href",
      "/us/en/account",
    );
  });

  it("drops the saved tab when the General wishlist setting is off", () => {
    render(
      <ThemeSettingsProvider settings={{ general: { enable_wishlist: false } }}>
        <MarketplaceBottomNav basePath="/us/en" />
      </ThemeSettingsProvider>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "marketplaceNavigation",
    });
    expect(within(navigation).queryByText("navSaved")).not.toBeInTheDocument();
    expect(navigation.firstElementChild?.children).toHaveLength(4);
  });
});
