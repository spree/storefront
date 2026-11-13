import type { Category } from "@spree/sdk";
import { render } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { MarketplaceCategoryRow } from "@/components/layout/MarketplaceCategoryRow";

vi.mock("next/navigation", () => ({ usePathname: () => "/us/en" }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { category?: string }) =>
    values?.category ? `${key} ${values.category}` : key,
}));
vi.mock("@/contexts/ThemeSettingsContext", () => ({
  useStoreThemeSettings: () => ({ navigation: { style: "mega" } }),
}));

function category(
  id: string,
  parent_id: string | null,
  permalink: string,
  name: string,
  children: Category[] = [],
): Category {
  return {
    id,
    parent_id,
    permalink,
    name,
    children,
    position: 0,
    depth: parent_id ? 1 : 0,
    meta_title: null,
    meta_description: null,
    meta_keywords: null,
    children_count: children.length,
    description: "",
    description_html: "",
    image_url: null,
    square_image_url: null,
    is_root: !parent_id,
    is_child: Boolean(parent_id),
    is_leaf: children.length === 0,
  };
}

describe("MarketplaceCategoryRow", () => {
  it("limits desktop triggers to seven and opens only the selected category menu", () => {
    const roots = Array.from({ length: 12 }, (_, index) => {
      const id = `category-${index + 1}`;
      return category(id, null, id, `Category ${index + 1}`, [
        category(`${id}-child`, id, `${id}/child`, `Child ${index + 1}`),
      ]);
    });
    const { container } = render(
      <MarketplaceCategoryRow basePath="/us/en" categories={roots} />,
    );

    const desktopNavigation = container.querySelector<HTMLElement>(
      "nav[data-theme-category-navigation]",
    );
    expect(
      desktopNavigation?.querySelectorAll("[data-mega-trigger]"),
    ).toHaveLength(7);
    expect(desktopNavigation?.className).not.toContain("overflow-x-auto");
    const firstTrigger = desktopNavigation?.querySelector<HTMLButtonElement>(
      '[data-mega-trigger="category-1"]',
    );
    expect(firstTrigger?.className).toContain("rounded-full");
    expect(firstTrigger?.className).toContain("hover:bg-marketplace-accent");
    expect(firstTrigger?.querySelector("svg")).toBeNull();

    act(() => {
      firstTrigger?.click();
    });
    expect(firstTrigger?.getAttribute("style")).toContain(
      "background-color: var(--marketplace-accent)",
    );

    expect(
      document.body.querySelector('[id="mega-panel-category-1"]')?.textContent,
    ).toContain("Child 1");
    expect(
      document.body.querySelector('[id="mega-panel-category-1"]')?.textContent,
    ).not.toContain("Category 12");
  });

  it("opens a nested category panel on pointer hover and closes on Escape", async () => {
    const leaf = category("leaf", "art", "art/prints", "Prints");
    const root = category("art", null, "art", "Art", [leaf]);
    const { container } = render(
      <MarketplaceCategoryRow basePath="/us/en" categories={[root]} />,
    );
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-mega-trigger="art"]',
    );
    expect(trigger).not.toBeNull();
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(
      document.body.querySelector<HTMLAnchorElement>(
        'a[href="/us/en/c/art/prints"]',
      ),
    ).not.toBeNull();
    const menuPanel = document.body.querySelector<HTMLElement>(
      '[id="mega-panel-art"]',
    );
    expect(
      menuPanel?.querySelector("[data-mega-category-switcher]"),
    ).toBeNull();
    expect(menuPanel?.firstElementChild?.className).toContain("max-w-[1560px]");
    expect(menuPanel?.querySelector("section")?.className).not.toMatch(
      /max-h-|overflow-y-auto/,
    );

    await act(async () => {
      trigger?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("uses published CMS navigation order and keeps category links SEO-friendly", () => {
    const categoryNode = category("cat_1", null, "home/decor", "Decor", [
      category("cat_2", "cat_1", "home/decor/prints", "Prints"),
    ]);
    const { container } = render(
      <MarketplaceCategoryRow
        basePath="/us/en"
        categories={[categoryNode]}
        menuItems={[
          {
            id: "decor-menu",
            type: "category",
            label: "Home",
            category_id: "cat_1",
            enabled: true,
          },
        ]}
      />,
    );

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-mega-trigger="decor-menu"]',
    );
    act(() => {
      trigger?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    expect(
      document.body.querySelector<HTMLAnchorElement>(
        'a[href="/us/en/c/home/decor/prints"]',
      ),
    ).not.toBeNull();
  });

  it("shows a focused full-width mega menu without repeating the category rail", () => {
    const room = category("room", "home", "home/living/room", "Room Decor");
    room.image_url = "https://cdn.example.test/room.jpg";
    room.square_image_url = "https://cdn.example.test/room-square.jpg";
    const home = category("home", null, "home/living", "Home & Living", [room]);
    const art = category("art", null, "art", "Art & Collectibles");
    const { container } = render(
      <MarketplaceCategoryRow
        basePath="/us/en"
        categories={[home, art]}
        menuItems={[
          {
            id: "home-menu",
            type: "category",
            label: "Home & Living",
            category_id: "home",
          },
          {
            id: "art-menu",
            type: "category",
            label: "Art & Collectibles",
            category_id: "art",
          },
        ]}
      />,
    );
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-mega-trigger="home-menu"]',
    );
    act(() =>
      trigger?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })),
    );

    const panel = document.body.querySelector<HTMLElement>(
      '[id="mega-panel-home-menu"]',
    );
    expect(panel?.textContent).toContain("Room Decor");
    expect(panel?.textContent).not.toContain("Art & Collectibles");
    expect(panel?.className).toContain("inset-x-0");
    expect(panel?.className).toContain("w-full");
    expect(panel?.firstElementChild?.className).toContain("max-w-[1560px]");
    expect(
      panel?.firstElementChild?.querySelector("section")?.className,
    ).not.toMatch(/max-h-|overflow-y-auto/);
    expect(panel?.querySelector("[data-mega-category-switcher]")).toBeNull();
    const roomColumn = panel?.querySelector<HTMLElement>(
      "[data-mega-menu-column]",
    );
    expect(roomColumn?.querySelector("h2")?.textContent).toBe("Room Decor");
    expect(roomColumn?.textContent).toContain("shopCategory Room Decor");
    expect(panel?.querySelectorAll("[data-mega-menu-column]")).toHaveLength(1);
    expect(
      roomColumn?.querySelector(
        'img[src="https://cdn.example.test/room-square.jpg"]',
      ),
    ).not.toBeNull();
    expect(
      panel?.querySelector('a[href="/us/en/c/home/living/room"]'),
    ).not.toBeNull();
  });

  it("renders the selected CMS icon beside a desktop menu item", () => {
    const { container } = render(
      <MarketplaceCategoryRow
        basePath="/us/en"
        categories={[]}
        menuItems={[
          {
            id: "gift-menu",
            type: "internal_link",
            label: "Gifts",
            target: "/products?q=gifts",
            icon: "gift",
          },
        ]}
      />,
    );

    expect(
      container.querySelector('[data-cms-navigation-icon="gift"]'),
    ).not.toBeNull();
  });

  it("uses a warm hover highlight instead of a saved CMS background color", async () => {
    const { container } = render(
      <MarketplaceCategoryRow
        basePath="/us/en"
        categories={[]}
        menuItems={[
          {
            id: "gift-menu",
            type: "internal_link",
            label: "Gifts",
            target: "/products?q=gifts",
            background_color: "#0E0B0B",
            text_color: "#BA2B2B",
          },
        ]}
      />,
    );
    const trigger = container.querySelector<HTMLAnchorElement>(
      "nav[data-theme-category-navigation] a[data-mega-trigger]",
    );
    expect(trigger?.getAttribute("style")).not.toContain("background-color");

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(trigger?.getAttribute("style")).toContain(
      "background-color: var(--marketplace-accent)",
    );
    expect(trigger?.getAttribute("style")).toContain(
      "color: var(--marketplace-foreground)",
    );
  });

  it("refreshes the menu when the Theme Builder previews another published menu", () => {
    const { container } = render(
      <MarketplaceCategoryRow
        basePath="/us/en"
        categories={[]}
        menuKey="header"
      />,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent("spree:cms-navigation-preview", {
          detail: {
            key: "header",
            items: [
              {
                id: "seasonal",
                type: "internal_link",
                label: "Seasonal guide",
                target: "/pages/seasonal-guide",
              },
            ],
          },
        }),
      );
    });

    expect(
      container.querySelector<HTMLAnchorElement>(
        'a[href="/us/en/pages/seasonal-guide"]',
      ),
    ).not.toBeNull();
  });

  it("shows CMS featured panels, personalized categories, and localized curated searches", () => {
    const featuredCategory = category("cat-featured", null, "garden", "Garden");
    const personalCategory = category("cat-personal", null, "prints", "Prints");
    const { container } = render(
      <MarketplaceCategoryRow
        basePath="/us/fr"
        categories={[featuredCategory, personalCategory]}
        menuSettings={{
          show_for_you: true,
          search_shortcuts: [
            {
              id: "search-1",
              label: "Sunflower cards",
              query: "cartes tournesol",
            },
          ],
        }}
        forYouCategoryIds={["cat-personal"]}
        menuItems={[
          {
            id: "garden-menu",
            type: "category",
            label: "Garden",
            category_id: "cat-featured",
            featured_panels: [
              {
                id: "panel-1",
                heading: "Fresh from the garden",
                text: "Seasonal artwork",
                cta_label: "Browse",
                destination_type: "category",
                category_id: "cat-featured",
                image_url: "https://cdn.example.test/garden.jpg",
                desktop_visible: true,
                mobile_visible: true,
              },
            ],
          },
        ]}
      />,
    );
    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-mega-trigger="garden-menu"]',
    );
    act(() =>
      trigger?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })),
    );

    expect(document.body.textContent).toContain("Garden");
    const featuredImage = document.body.querySelector<HTMLImageElement>(
      '[data-mega-menu-column] img[src="https://cdn.example.test/garden.jpg"]',
    );
    expect(featuredImage).not.toBeNull();
    expect(featuredImage?.className).toContain("aspect-[16/10]");
    expect(featuredImage?.className).toContain("object-cover");
    expect(
      featuredImage?.closest("[data-mega-menu-column]")?.textContent,
    ).toContain("shopCategory Fresh from the garden");
    expect(
      document.body.querySelector('a[href="/us/fr/c/garden"]'),
    ).not.toBeNull();
    expect(
      document.body.querySelector('a[href="/us/fr/c/prints"]')?.textContent,
    ).toBe("Prints");
    expect(
      document.body.querySelector(
        'a[href="/us/fr/products?q=cartes%20tournesol"]',
      )?.textContent,
    ).toBe("Sunflower cards");
  });
});
