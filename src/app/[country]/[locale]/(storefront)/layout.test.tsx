import {
  Children,
  Fragment,
  type ReactElement,
  type ReactNode,
  Suspense,
} from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/data/categories", () => ({ getCategories: vi.fn() }));
vi.mock("@/components/layout/Header", () => ({
  Header: () => null,
  HeaderMobileMenu: () => null,
}));
vi.mock("@/components/layout/SkipLink", () => ({
  MainContent: () => null,
  SkipLink: () => null,
}));
vi.mock("@/components/layout/Footer", () => ({
  Footer: () => null,
  FooterCategoryLinks: () => null,
}));

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MainContent, SkipLink } from "@/components/layout/SkipLink";
import StorefrontLayout from "./layout";

interface LayoutElementProps {
  children?: ReactNode;
  mobileNavigation?: ReactElement<{ fallback: ReactNode }>;
  categoryLinks?: ReactElement<{ fallback: ReactNode }>;
  fallback?: ReactNode;
}

describe("StorefrontLayout", () => {
  it("renders a skip link first and keeps page chrome outside the category navigation Suspense boundaries", async () => {
    const content = <section>Storefront content</section>;
    const layout = (await StorefrontLayout({
      children: content,
      params: Promise.resolve({ country: "us", locale: "en" }),
    })) as ReactElement<LayoutElementProps>;

    expect(layout.type).toBe(Fragment);

    const [skipLink, header, hiddenNavigation, main, footer] = Children.toArray(
      layout.props.children,
    ) as ReactElement<LayoutElementProps>[];

    expect(skipLink.type).toBe(SkipLink);
    expect(header.type).toBe(Header);
    expect(hiddenNavigation.type).toBe(Suspense);
    expect(main.type).toBe(MainContent);
    expect(main.props.children).toBe(content);
    expect(footer.type).toBe(Footer);

    const mobileNavigation = header.props.mobileNavigation;
    const categoryLinks = footer.props.categoryLinks;

    expect(mobileNavigation?.type).toBe(Suspense);
    expect(mobileNavigation?.props.fallback).not.toBeNull();
    expect(hiddenNavigation.props.fallback).toBeNull();
    expect(categoryLinks?.type).toBe(Suspense);
    expect(categoryLinks?.props.fallback).not.toBeNull();
  });
});
