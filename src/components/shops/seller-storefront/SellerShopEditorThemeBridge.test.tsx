import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SellerShopEditorThemeBridge } from "./SellerShopEditorThemeBridge";

describe("SellerShopEditorThemeBridge", () => {
  it("immediately hides or restores the featured section in the editor preview", () => {
    const { container } = render(
      <>
        <header data-theme-seller-identity>
          <SellerShopEditorThemeBridge enabled />
        </header>
        <section data-seller-featured-section />
      </>,
    );
    const featuredSection = container.querySelector<HTMLElement>(
      "[data-seller-featured-section]",
    )!;

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { preferred_featured_layout: "none" },
          },
        }),
      );
    });

    expect(featuredSection.hidden).toBe(true);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { preferred_featured_layout: "standard" },
          },
        }),
      );
    });

    expect(featuredSection.hidden).toBe(false);
  });

  it("hides the banner and cover fallback when the banner layout is none", () => {
    const { container } = render(
      <>
        <header data-theme-seller-identity>
          <SellerShopEditorThemeBridge enabled />
        </header>
        <section data-shop-banner-layout="carousel" />
        <div data-seller-shop-cover-fallback />
      </>,
    );
    const banner = container.querySelector<HTMLElement>(
      "[data-shop-banner-layout]",
    )!;
    const cover = container.querySelector<HTMLElement>(
      "[data-seller-shop-cover-fallback]",
    )!;

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { banner: { layout: "none", slides: [] } },
          },
        }),
      );
    });

    expect(banner.hidden).toBe(true);
    expect(cover.hidden).toBe(true);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { banner: { layout: "single_standard", slides: [] } },
          },
        }),
      );
    });

    expect(banner.hidden).toBe(false);
    expect(cover.hidden).toBe(false);
  });

  it("updates the storefront theme from trusted editor preview messages", () => {
    const { container } = render(
      <header data-theme-seller-identity>
        <SellerShopEditorThemeBridge enabled />
      </header>,
    );
    const header = container.querySelector("header")!;

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { shop_accent_color: "#f08092" },
          },
        }),
      );
    });

    expect(header.style.getPropertyValue("--marketplace-seller-accent")).toBe(
      "#f08092",
    );
    expect(
      header.style.getPropertyValue("--marketplace-seller-action-bg"),
    ).toBe("#ffffff");
    expect(
      header.style.getPropertyValue("--marketplace-seller-action-border"),
    ).toBe("#f08092");
    expect(
      header.style.getPropertyValue("--marketplace-seller-action-text"),
    ).toBe("#222222");
    expect(
      header.style.getPropertyValue("--marketplace-seller-rating-star"),
    ).toBe("#5a3c12");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: null,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { shop_accent_color: "#00ff00" },
          },
        }),
      );
    });

    expect(header.style.getPropertyValue("--marketplace-seller-accent")).toBe(
      "#f08092",
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { shop_accent_color: "#273a35" },
          },
        }),
      );
    });

    expect(
      header.style.getPropertyValue("--marketplace-seller-action-bg"),
    ).toBe("#ffffff");
    expect(
      header.style.getPropertyValue("--marketplace-seller-action-border"),
    ).toBe("#ffffff");
    expect(
      header.style.getPropertyValue("--marketplace-seller-action-text"),
    ).toBe("#273a35");
    expect(
      header.style.getPropertyValue("--marketplace-seller-rating-star"),
    ).toBe("#ffffff");
  });

  it("restores readable default text when the accent color is cleared", () => {
    const { container } = render(
      <>
        <header data-theme-seller-identity>
          <SellerShopEditorThemeBridge enabled />
        </header>
        <section
          data-theme-seller-about
          style={{
            backgroundColor: "var(--marketplace-seller-accent, #faf9f7)",
            color: "var(--marketplace-seller-accent-text, #ffffff)",
          }}
        >
          <p data-seller-accent-story-tagline style={{ color: "#ffffff" }}>
            Shop story
          </p>
        </section>
      </>,
    );
    const about = container.querySelector<HTMLElement>(
      "[data-theme-seller-about]",
    )!;
    const tagline = container.querySelector<HTMLElement>(
      "[data-seller-accent-story-tagline]",
    )!;

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { shop_accent_color: "#651a32" },
          },
        }),
      );
    });
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: window,
          data: {
            source: "spree-shop-editor-parent",
            action: "patch",
            payload: { shop_accent_color: null },
          },
        }),
      );
    });

    expect(
      about.style.getPropertyValue("--marketplace-seller-accent-text"),
    ).toBe("#29252d");
    expect(about.style.getPropertyValue("--marketplace-seller-accent")).toBe(
      "#faf9f7",
    );
    expect(tagline.style.color).toBe("");
  });
});
