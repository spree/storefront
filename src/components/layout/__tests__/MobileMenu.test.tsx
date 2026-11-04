import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileMenu } from "@/components/layout/MobileMenu";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      closeMenu: "Close menu",
      openMenu: "Open menu",
      menu: "Menu",
      home: "Home",
      allProducts: "All Products",
      contact: "Contact",
      myAccount: "My Account",
      wholesale: "Wholesale",
      sellers: "Sellers",
    })[key] ?? key,
}));

vi.mock("@/components/layout/RegionPreferences", () => ({
  RegionPreferences: ({ variant }: { variant: string }) => (
    <button type="button" aria-label="Region and language">
      {variant}
    </button>
  ),
}));

describe("MobileMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("places My Account below Wholesale and centers Region and language", async () => {
    const user = userEvent.setup();

    render(
      <MobileMenu rootCategories={[]} basePath="/us/en" wholesaleEnabled />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Menu" });
    const wholesale = within(menu).getByRole("link", { name: "Wholesale" });
    const myAccount = within(menu).getByRole("link", { name: "My Account" });
    const regionPreferences = within(menu).getByRole("button", {
      name: "Region and language",
    });
    const footer = regionPreferences.closest('[data-slot="sheet-footer"]');

    expect(
      wholesale.compareDocumentPosition(myAccount) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(footer).toHaveClass("items-center");
  });

  it("keeps the wholesale entry hidden when the addon is disabled", async () => {
    const user = userEvent.setup();

    render(
      <MobileMenu
        rootCategories={[]}
        basePath="/us/en"
        wholesaleEnabled={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(
      within(menu).queryByRole("link", { name: "Wholesale" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).getByRole("link", { name: "My Account" }),
    ).toHaveAttribute("href", "/us/en/account");
  });

  it("links to the seller directory only when the marketplace is enabled", async () => {
    const user = userEvent.setup();

    const { unmount } = render(
      <MobileMenu
        rootCategories={[]}
        basePath="/us/en"
        wholesaleEnabled={false}
        marketplaceEnabled
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      within(screen.getByRole("dialog", { name: "Menu" })).getByRole("link", {
        name: "Sellers",
      }),
    ).toHaveAttribute("href", "/us/en/sellers");
    unmount();

    render(
      <MobileMenu
        rootCategories={[]}
        basePath="/us/en"
        wholesaleEnabled={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      within(screen.getByRole("dialog", { name: "Menu" })).queryByRole("link", {
        name: "Sellers",
      }),
    ).not.toBeInTheDocument();
  });
});
