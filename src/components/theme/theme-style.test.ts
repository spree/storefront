import type { CmsTheme } from "@spree/sdk";
import { describe, expect, it } from "vitest";
import { themeGlobalDataAttributes, themeInlineStyle } from "./theme-style";

describe("theme global style resolution", () => {
  it("converts editor color and layout settings into storefront variables", () => {
    const theme = {
      settings: {
        colors: { form_background: "#fefefe", popup_overlay: "#112233" },
        typography: { font_library: "google", base_size: "large" },
        buttons: {
          style: "outline",
          primary_background: "#123456",
          font_size: "small",
        },
        products_grid: {
          columns: "5",
          image_ratio: "portrait",
          card_radius: "large",
          card_shadow: "subtle",
        },
        cart: { background_color: "#abcdef" },
        popups: {
          overlay_opacity: "50",
          background_blur: true,
          corner_radius: "large",
        },
      },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--theme-form-background"]).toBe("#fefefe");
    expect(style["--theme-button-primary-background"]).toBe("#123456");
    expect(style["--marketplace-product-grid-columns"]).toBe("5");
    expect(style["--marketplace-product-image-ratio"]).toBe("4 / 5");
    expect(style["--marketplace-product-card-radius"]).toBe(
      "var(--marketplace-radius-lg)",
    );
    expect(style["--marketplace-product-shadow"]).toContain(
      "rgb(43 39 45 / 8%)",
    );
    expect(style["--theme-cart-background"]).toBe("#abcdef");
    expect(style["--theme-popup-overlay"]).toBe(
      "color-mix(in srgb, #112233 50%, transparent)",
    );
    expect(style["--theme-popup-blur"]).toBe("blur(8px)");
    expect(style["--theme-popup-radius"]).toBe("1rem");
  });

  it("produces the global data attributes that activate storefront settings", () => {
    const theme = {
      settings: {
        buttons: { style: "outline" },
        general: { enable_wishlist: "false" },
        navigation: {
          sticky: "true",
          style: "mega",
          mobile_style: "accordion",
        },
        animations: { enabled: "false", style: "none" },
        collection_page: { show_banner: "false", show_toolbar: "false" },
        products_grid: { show_arrows: "false" },
        product_swatches: { enabled: "true" },
      },
    } as unknown as CmsTheme;

    const attributes = themeGlobalDataAttributes(theme);
    expect(attributes["data-theme-global-button-style"]).toBe("outline");
    expect(attributes["data-theme-global-navigation-sticky"]).toBe("true");
    expect(attributes["data-theme-global-mobile-navigation-style"]).toBe(
      "accordion",
    );
    expect(attributes["data-theme-global-animations"]).toBe("false");
    expect(attributes["data-theme-global-collection-banner"]).toBe("false");
    expect(attributes["data-theme-global-listing-toolbar"]).toBe("false");
    expect(attributes["data-theme-global-arrows"]).toBe("false");
    expect(attributes["data-theme-global-product-swatches"]).toBe("true");
    expect(attributes["data-theme-global-wishlist"]).toBe("false");
  });

  it("exposes configured page-title typography to storefront styles", () => {
    const theme = {
      settings: {
        typography: { page_title_font: "body", page_title_size: "large" },
      },
    } as unknown as CmsTheme;

    expect(themeGlobalDataAttributes(theme)).toMatchObject({
      "data-theme-global-page-title-font": "body",
      "data-theme-global-page-title-size": "large",
    });
  });

  it("keeps the theme wrapper full width while exposing the configured content width", () => {
    const theme = {
      settings: {
        layout: { page_width: "standard", full_width_side_margin: 40 },
      },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--marketplace-page-width"]).toBe("1200px");
    expect(style["--marketplace-full-width-side-margin"]).toBe("40px");
    expect(style.maxWidth).toBeUndefined();
  });

  it("maps corner sizes and section spacing onto storefront variables", () => {
    const theme = {
      settings: {
        shape: { radius_sm: "none", radius_md: "medium", radius_lg: "large" },
        layout: { section_spacing: "spacious" },
      },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--marketplace-radius-sm"]).toBe("0px");
    expect(style["--radius-md"]).toBe("12px");
    expect(style["--marketplace-radius-lg"]).toBe("24px");
    expect(style["--cms-section-spacing"]).toBe("5rem");
    expect(style["--cms-section-spacing-scale"]).toBe("2.4");
  });

  it("uses a named font family and weight when the theme sets one", () => {
    const theme = {
      settings: {
        typography: {
          font_library: "system",
          body_family: "Inter",
          body_weight: "700",
          heading_family: "Playfair Display",
          accent_family: "Helvetica",
          accent_weight: "500",
        },
      },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--marketplace-body-font"]).toBe('"Inter", sans-serif');
    expect(style["--marketplace-body-font-weight"]).toBe("700");
    expect(style["--marketplace-heading-font"]).toBe(
      '"Playfair Display", sans-serif',
    );
    expect(style["--marketplace-accent-font"]).toBe(
      "Helvetica, Arial, sans-serif",
    );
    expect(style.fontWeight).toBe("700");
  });

  it("applies paragraph and heading typography scales", () => {
    const theme = {
      settings: {
        typography: {
          body_size: "16",
          heading_1_case: "uppercase",
          heading_4_size: "s",
          heading_4_line_height: "loose",
          palette_color: "#111111",
        },
      },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--marketplace-body-size"]).toBe("16px");
    expect(style["--marketplace-paragraph-size"]).toBe("calc(1rem * 1)");
    expect(style["--marketplace-heading1-case"]).toBe("uppercase");
    expect(style["--marketplace-heading4-line-height"]).toBe("1.75");
    expect(style["--marketplace-inverse-foreground"]).toBe("#111111");
  });

  it("applies preset and custom pixel sizes to paragraph and headings", () => {
    const theme = {
      settings: {
        typography: {
          paragraph_size: "18",
          heading_1_size: "custom",
          heading_1_custom_size: "27",
        },
      },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--marketplace-paragraph-size"]).toBe("18px");
    expect(style["--marketplace-heading1-size"]).toBe("27px");
  });

  it("ignores a font family that could break the stylesheet", () => {
    const theme = {
      settings: { typography: { body_family: 'Inter"; color: red' } },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--marketplace-body-font"]).not.toContain("color");
  });

  it("maps narrow and full page widths onto the content width", () => {
    expect(
      (
        themeInlineStyle({
          settings: { layout: { page_width: "narrow" } },
        } as unknown as CmsTheme) as Record<string, string>
      )["--marketplace-page-width"],
    ).toBe("1080px");
    expect(
      (
        themeInlineStyle({
          settings: { layout: { page_width: "full" } },
        } as unknown as CmsTheme) as Record<string, string>
      )["--marketplace-page-width"],
    ).toBe("100%");
  });

  it("keeps the page shell background white even when theme colors set background", () => {
    const theme = {
      settings: { colors: { background: "#f8f4f0", brand: "#112233" } },
    } as unknown as CmsTheme;

    const style = themeInlineStyle(theme) as Record<string, string>;
    expect(style["--marketplace-background"]).toBe("#ffffff");
    expect(style["--marketplace-canvas"]).toBe("#ffffff");
    expect(style["--marketplace-surface-warm"]).toBe("#ffffff");
    expect(style["--marketplace-brand"]).toBe("#112233");
  });

  it("clamps full-width section side margins to the supported range", () => {
    const theme = {
      settings: { layout: { full_width_side_margin: 240 } },
    } as unknown as CmsTheme;

    expect(
      (themeInlineStyle(theme) as Record<string, string>)[
        "--marketplace-full-width-side-margin"
      ],
    ).toBe("120px");
  });
});
