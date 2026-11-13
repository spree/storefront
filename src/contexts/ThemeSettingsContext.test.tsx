import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ThemeSettingsProvider,
  useStoreThemeSettings,
} from "@/contexts/ThemeSettingsContext";

function ThemeSettingsProbe() {
  const settings = useStoreThemeSettings();
  return <output>{String(settings.search?.suggestions ?? "unset")}</output>;
}

describe("ThemeSettingsProvider font libraries", () => {
  it("loads Google font families and applies them to body and heading font roles", () => {
    const html = renderToStaticMarkup(
      <ThemeSettingsProvider
        settings={{ typography: { font_library: "google" } }}
      >
        <main>Store</main>
      </ThemeSettingsProvider>,
    );

    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).toContain(
      "--marketplace-body-font:&quot;Roboto&quot;, sans-serif",
    );
    expect(html).toContain(
      "--marketplace-heading-font:&quot;Playfair Display&quot;, serif",
    );
  });

  it("loads a chosen font family and weight", () => {
    const html = renderToStaticMarkup(
      <ThemeSettingsProvider
        settings={{
          typography: {
            body_family: "Inter",
            body_weight: "700",
            heading_family: "Abril Fatface",
            heading_weight: "400",
            accent_family: "Helvetica",
          },
        }}
      >
        <main>Store</main>
      </ThemeSettingsProvider>,
    );

    expect(html).toContain("family=Inter:wght@700");
    expect(html).toContain("family=Abril+Fatface:wght@400");
    expect(html).not.toContain("family=Helvetica");
    expect(html).toContain(
      "--marketplace-body-font:&quot;Inter&quot;, sans-serif",
    );
    expect(html).toContain("--marketplace-body-font-weight:700");
    expect(html).toContain(
      "--marketplace-accent-font:Helvetica, Arial, sans-serif",
    );
  });

  it("uses the Shopify system font stacks when selected", () => {
    const html = renderToStaticMarkup(
      <ThemeSettingsProvider
        settings={{ typography: { font_library: "shopify" } }}
      >
        <main>Store</main>
      </ThemeSettingsProvider>,
    );

    expect(html).toContain("-apple-system, BlinkMacSystemFont");
    expect(html).toContain("Georgia");
    expect(html).not.toContain("fonts.googleapis.com");
  });

  it("exposes page-title typography settings on the live storefront root", () => {
    const html = renderToStaticMarkup(
      <ThemeSettingsProvider
        settings={{
          typography: { page_title_font: "body", page_title_size: "large" },
        }}
      >
        <main>Store</main>
      </ThemeSettingsProvider>,
    );

    expect(html).toContain('data-theme-global-page-title-font="body"');
    expect(html).toContain('data-theme-global-page-title-size="large"');
  });

  it("applies full-width section margins on the live storefront root", () => {
    const html = renderToStaticMarkup(
      <ThemeSettingsProvider
        settings={{ layout: { full_width_side_margin: "48" } }}
      >
        <main>Store</main>
      </ThemeSettingsProvider>,
    );

    expect(html).toContain("--marketplace-full-width-side-margin:48px");
  });

  it("exposes the General wishlist toggle to storefront consumers", () => {
    const html = renderToStaticMarkup(
      <ThemeSettingsProvider settings={{ general: { enable_wishlist: false } }}>
        <main>Store</main>
      </ThemeSettingsProvider>,
    );

    expect(html).toContain('data-theme-global-wishlist="false"');
  });

  it("forwards primary and secondary button colors to the storefront theme", () => {
    const html = renderToStaticMarkup(
      <ThemeSettingsProvider
        settings={{
          buttons: {
            primary_background: "#112233",
            primary_text: "#ffffff",
            primary_border: "#334455",
            secondary_background: "#ddeeff",
            secondary_text: "#223344",
            secondary_border: "#556677",
          },
        }}
      >
        <main>Store</main>
      </ThemeSettingsProvider>,
    );

    expect(html).toContain("--theme-button-primary-background:#112233");
    expect(html).toContain("--theme-button-primary-text:#ffffff");
    expect(html).toContain("--theme-button-primary-border:#334455");
    expect(html).toContain("--theme-button-secondary-background:#ddeeff");
    expect(html).toContain("--theme-button-secondary-text:#223344");
    expect(html).toContain("--theme-button-secondary-border:#556677");
  });
});

describe("ThemeSettingsProvider live preview updates", () => {
  it("updates context consumers when the theme builder changes global settings", () => {
    render(
      <ThemeSettingsProvider settings={{ search: { suggestions: true } }}>
        <ThemeSettingsProbe />
      </ThemeSettingsProvider>,
    );
    expect(screen.getByText("true")).toBeDefined();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("spree:theme-settings-preview", {
          detail: { search: { suggestions: "false" } },
        }),
      );
    });

    expect(screen.getByText("false")).toBeDefined();
  });
});
