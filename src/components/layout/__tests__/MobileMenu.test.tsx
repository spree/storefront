import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ThemeSettingsProvider } from "@/contexts/ThemeSettingsContext";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      closeMenu: "Close menu",
      openMenu: "Open menu",
      menu: "Menu",
      home: "Home",
      allProducts: "All Products",
      quickLinks: "Quick links",
      shopByCategory: "Shop by category",
      navExplore: "Explore",
      featured: "Featured",
      contact: "Contact",
      myAccount: "My Account",
      wholesale: "Wholesale",
      forYou: "For you",
      exploreSearches: "Explore searches",
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
    expect(footer).toHaveClass(
      "pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]",
    );
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

  it("keeps category rows photo-led and opens nested CMS links in the Explore drawer", async () => {
    const user = userEvent.setup();
    render(
      <MobileMenu
        rootCategories={[]}
        basePath="/us/en"
        wholesaleEnabled={false}
        cmsItems={[
          {
            id: "gifts",
            type: "internal_link",
            label: "Gifts",
            target: "/products?q=gifts",
            icon: "gift",
            children: [
              {
                id: "for-her",
                type: "internal_link",
                label: "For her",
                target: "/products?q=for-her",
                icon: "heart",
              },
            ],
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(
      within(menu).getByRole("button", { name: "Gifts" }),
    ).toBeInTheDocument();
    expect(menu.querySelector('[data-cms-navigation-icon="gift"]')).toBeNull();
    await user.click(within(menu).getByRole("button", { name: "Gifts" }));
    expect(within(menu).getByRole("link", { name: "For her" })).toHaveAttribute(
      "href",
      "/us/en/products?q=for-her",
    );
    expect(
      menu.querySelector('[data-cms-navigation-icon="heart"]'),
    ).not.toBeNull();
  });

  it("applies the menu block mobile layout settings", async () => {
    const user = userEvent.setup();
    render(
      <MobileMenu
        rootCategories={[
          {
            id: "category-1",
            name: "Home",
            permalink: "home",
            position: 0,
            depth: 0,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            children_count: 0,
            parent_id: null,
            description: "",
            description_html: "",
            image_url: null,
            square_image_url: null,
            is_root: true,
            is_child: false,
            is_leaf: true,
          },
        ]}
        basePath="/us/en"
        wholesaleEnabled={false}
        accordionNavigation
        showNavigationBar
        showDividers
        menuBackgroundColor="#ffffff"
        menuTextColor="#222222"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Menu" });
    const navigationBar = within(menu).getByRole("navigation", {
      name: "categoryNavigation",
    });
    expect(navigationBar).toHaveAttribute("data-theme-mobile-navigation-bar");
    expect(
      within(navigationBar).getByRole("link", { name: "Home" }),
    ).toHaveClass("rounded-full");
    expect(menu).toHaveStyle({ backgroundColor: "#ffffff", color: "#222222" });
  });

  it("uses the global mobile navigation style when the menu has no override", async () => {
    const user = userEvent.setup();
    render(
      <ThemeSettingsProvider
        settings={{ navigation: { mobile_style: "accordion" } }}
      >
        <MobileMenu
          rootCategories={[
            {
              id: "category-1",
              name: "Home",
              permalink: "home",
              position: 0,
              depth: 0,
              meta_title: null,
              meta_description: null,
              meta_keywords: null,
              children_count: 1,
              parent_id: null,
              description: "",
              description_html: "",
              image_url: null,
              square_image_url: null,
              is_root: true,
              is_child: false,
              is_leaf: false,
              children: [
                {
                  id: "child-1",
                  name: "Decor",
                  permalink: "decor",
                  position: 0,
                  depth: 1,
                  meta_title: null,
                  meta_description: null,
                  meta_keywords: null,
                  children_count: 0,
                  parent_id: "category-1",
                  description: "",
                  description_html: "",
                  image_url: null,
                  square_image_url: null,
                  is_root: false,
                  is_child: true,
                  is_leaf: true,
                },
              ],
            },
          ]}
          basePath="/us/en"
          wholesaleEnabled={false}
          accordionNavigation={false}
        />
      </ThemeSettingsProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(
      within(menu)
        .getByText("Home", { selector: "summary" })
        .closest("details"),
    ).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Decor" })).toHaveAttribute(
      "href",
      "/us/en/c/decor",
    );
  });

  it("shows compact image-led menu rows and locale-aware shortcuts", async () => {
    const user = userEvent.setup();
    render(
      <MobileMenu
        rootCategories={[
          {
            id: "cat-prints",
            name: "Prints",
            permalink: "prints",
            position: 0,
            depth: 0,
            meta_title: null,
            meta_description: null,
            meta_keywords: null,
            children_count: 0,
            parent_id: null,
            description: "",
            description_html: "",
            image_url: "https://cdn.example.test/prints.jpg",
            square_image_url: "https://cdn.example.test/prints-square.jpg",
            is_root: true,
            is_child: false,
            is_leaf: true,
          },
        ]}
        basePath="/us/fr"
        wholesaleEnabled={false}
        cmsItems={[
          {
            id: "prints-menu",
            type: "internal_link",
            label: "Prints",
            target: "/products?q=prints",
          },
          {
            id: "root",
            type: "internal_link",
            label: "Stories",
            target: "/pages/stories",
            featured_panels: [
              {
                id: "maker-story",
                heading: "Meet the makers",
                text: "Their latest work",
                cta_label: "Read the story",
                destination_type: "internal_link",
                target: "/pages/makers",
                mobile_visible: true,
              },
            ],
          },
        ]}
        cmsSettings={{
          show_for_you: true,
          search_shortcuts: [
            { id: "cards", label: "Greeting cards", query: "cartes" },
          ],
        }}
        forYouCategoryIds={["cat-prints"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(
      within(menu).queryByRole("navigation", { name: "Quick links" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole("link", { name: "Home" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole("link", { name: "All Products" }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).getByRole("heading", { name: "Shop by category" }),
    ).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/us/fr/products",
    );
    expect(within(menu).getByRole("link", { name: "Stories" })).toHaveAttribute(
      "href",
      "/us/fr/pages/stories",
    );
    expect(
      within(menu).getByRole("link", { name: "Stories" }).querySelector("img"),
    ).toHaveAttribute("src", "/marketplace/category-home.png");
    const printsMenuLink = within(menu)
      .getAllByRole("link", { name: "Prints" })
      .find((link) => link.getAttribute("href") === "/us/fr/products?q=prints");
    expect(printsMenuLink?.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.test/prints-square.jpg",
    );
    expect(
      within(menu).queryByRole("heading", { name: "Featured" }),
    ).not.toBeInTheDocument();
    const forYouSection = within(menu).getByText("For you")
      .parentElement as HTMLElement;
    expect(
      within(forYouSection).getByRole("link", { name: "Prints" }),
    ).toHaveAttribute("href", "/us/fr/c/prints");
    expect(
      within(menu).getByRole("link", { name: "Greeting cards" }),
    ).toHaveAttribute("href", "/us/fr/products?q=cartes");
  });
});
