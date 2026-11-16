import {
  Children,
  Fragment,
  type ReactElement,
  type ReactNode,
  Suspense,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { REQUEST_PATHNAME_HEADER, REQUEST_SEARCH_HEADER } from "@/i18n/routing";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  getActiveTheme: vi.fn(),
  themeSectionGroupsEnabled: vi.fn(() => false),
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/data/categories", () => ({ getCategories: vi.fn() }));
vi.mock("@/lib/theme/flags", () => ({
  editorialStorefrontEnabled: () => false,
  themeSectionGroupsEnabled: mocks.themeSectionGroupsEnabled,
}));
vi.mock("@/lib/theme/resolver", () => ({
  getActiveTheme: mocks.getActiveTheme,
  themeGroupHasContent: (group?: { order: string[] }) =>
    Boolean(group?.order.length),
}));
vi.mock("@/components/layout/Header", () => ({
  Header: () => null,
  HeaderMobileMenu: () => null,
}));
vi.mock("@/components/layout/Footer", () => ({
  Footer: () => null,
  FooterCategoryLinks: () => null,
}));

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StorefrontFooterGate } from "@/components/layout/StorefrontFooterGate";
import {
  StorefrontThemeFooter,
  StorefrontThemeHeader,
} from "@/components/theme/StorefrontThemeChrome";
import StorefrontLayout from "./layout";

interface LayoutElementProps {
  children?: ReactNode;
  mobileNavigation?: ReactElement<{ fallback: ReactNode }>;
  categoryLinks?: ReactElement<{ fallback: ReactNode }>;
  fallback?: ReactNode;
}

type StorefrontLayoutProps = Parameters<typeof StorefrontLayout>[0];

async function renderLayoutContent(props: StorefrontLayoutProps) {
  const boundary = StorefrontLayout(props) as ReactElement<LayoutElementProps>;
  const content = Children.only(boundary.props.children) as ReactElement<
    StorefrontLayoutProps,
    (props: StorefrontLayoutProps) => Promise<ReactElement>
  >;
  if (typeof content.type !== "function") {
    throw new Error(
      "Expected the storefront layout to contain a server component",
    );
  }
  return content.type(content.props);
}

describe("StorefrontLayout", () => {
  it("wraps header-dependent chrome behind a Suspense boundary", () => {
    const layout = StorefrontLayout({
      children: <section>Storefront content</section>,
      params: Promise.resolve({ country: "us", locale: "en" }),
    }) as ReactElement<LayoutElementProps>;

    expect(layout.type).toBe(Suspense);
    expect(layout.props.fallback).toBeNull();
  });

  it("keeps page chrome outside the category navigation Suspense boundaries", async () => {
    const content = <section>Storefront content</section>;
    mocks.headers.mockResolvedValue(
      new Headers({
        [REQUEST_PATHNAME_HEADER]: "/us/en/sellers/test-shop",
        [REQUEST_SEARCH_HEADER]: "",
      }),
    );
    const layout = (await renderLayoutContent({
      children: content,
      params: Promise.resolve({ country: "us", locale: "en" }),
    })) as ReactElement<LayoutElementProps>;

    expect(layout.type).toBe("div");

    const [header, categoryNavigation, main, footerWrapper] = Children.toArray(
      layout.props.children,
    ) as ReactElement<LayoutElementProps>[];
    const footerGate = Children.only(
      footerWrapper.props.children,
    ) as ReactElement<LayoutElementProps>;
    const footer = footerGate.props
      .children as ReactElement<LayoutElementProps>;

    expect(header.type).toBe(Header);
    expect(categoryNavigation.type).toBe(Suspense);
    expect(main.type).toBe("main");
    expect(main.props.children).toBe(content);
    expect(footerGate.type).toBe(StorefrontFooterGate);
    expect(footer.type).toBe(Footer);

    const mobileNavigation = header.props.mobileNavigation;
    const categoryLinks = footer.props.categoryLinks;

    expect(mobileNavigation?.type).toBe(Suspense);
    expect(mobileNavigation?.props.fallback).not.toBeNull();
    expect(categoryLinks?.type).toBe(Suspense);
    expect(categoryLinks?.props.fallback).not.toBeNull();
  });

  it("omits marketplace chrome in the shop editor preview", async () => {
    const content = <section>Shop preview</section>;
    mocks.headers.mockResolvedValue(
      new Headers({
        [REQUEST_PATHNAME_HEADER]: "/us/en/sellers/test-shop",
        [REQUEST_SEARCH_HEADER]: "?tab=home&shop_editor=1",
      }),
    );

    const layout = (await renderLayoutContent({
      children: content,
      params: Promise.resolve({ country: "us", locale: "en" }),
    })) as ReactElement<{ children?: ReactNode }>;

    expect(layout.type).toBe(Fragment);
    expect(layout.props.children).toBe(content);
  });

  it("keeps published CMS header and footer ahead of the storefront defaults", async () => {
    mocks.themeSectionGroupsEnabled.mockReturnValueOnce(true);
    mocks.getActiveTheme.mockResolvedValueOnce({
      section_groups: {
        header: { order: ["header"] },
        footer: { order: ["footer"] },
      },
    });
    mocks.headers.mockResolvedValueOnce(
      new Headers({ [REQUEST_PATHNAME_HEADER]: "/us/en" }),
    );

    const layout = await renderLayoutContent({
      children: <section>Storefront content</section>,
      params: Promise.resolve({ country: "us", locale: "en" }),
    });
    const props = (layout as ReactElement<LayoutElementProps>).props;
    const [header, main, footerWrapper] = Children.toArray(
      props.children,
    ) as ReactElement<LayoutElementProps>[];
    const footerGate = Children.only(
      footerWrapper.props.children,
    ) as ReactElement<LayoutElementProps>;

    expect(header.type).toBe(StorefrontThemeHeader);
    expect(main.type).toBe("main");
    expect(footerGate.type).toBe(StorefrontFooterGate);
    expect((footerGate.props.children as ReactElement).type).toBe(
      StorefrontThemeFooter,
    );
  });
});
