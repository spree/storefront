"use client";

import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-600.css";
import "@fontsource/roboto/latin-700.css";
import type { CSSProperties } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  applyNamedThemeFonts,
  themeGoogleFontStylesheets,
  themeTypographyScaleCustomized,
} from "@/components/theme/theme-fonts";
import {
  pinStorefrontShellBackground,
  shouldSkipShellThemeColorKey,
} from "@/components/theme/theme-style";
import { themeSettingEnabled } from "@/lib/theme/setting-value";

export type StoreThemeSettings = {
  general?: Record<string, string | boolean>;
  cart?: Record<string, string | boolean>;
  checkout?: Record<string, string | boolean>;
  colors?: Record<string, string>;
  shape?: Record<string, string>;
  layout?: Record<string, string>;
  typography?: Record<string, string>;
  buttons?: Record<string, string>;
  products_grid?: Record<string, string | boolean>;
  localization?: Record<string, string | boolean>;
  search?: Record<string, string | boolean>;
  product_swatches?: Record<string, string | boolean>;
  size_chart?: Record<string, string | boolean>;
  navigation?: Record<string, string | boolean>;
  social?: Record<string, string | boolean>;
  popups?: Record<string, string | boolean>;
  collection_page?: Record<string, string | boolean>;
  product_page?: Record<string, string | boolean>;
  animations?: Record<string, string | boolean>;
  age_verification?: Record<string, string | boolean>;
};

const ThemeSettingsContext = createContext<StoreThemeSettings>({});

export function ThemeSettingsProvider({
  settings: initialSettings,
  children,
}: {
  settings?: StoreThemeSettings;
  children: React.ReactNode;
}) {
  const [previewSettings, setPreviewSettings] =
    useState<StoreThemeSettings | null>(null);
  const settings = previewSettings ?? initialSettings ?? {};
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  useEffect(() => {
    setPreviewSettings(null);
  }, [initialSettings]);
  useEffect(() => {
    const applyPreviewSettings = (event: Event) => {
      const detail = (event as CustomEvent<StoreThemeSettings>).detail;
      if (detail && typeof detail === "object") setPreviewSettings(detail);
    };
    window.addEventListener(
      "spree:theme-settings-preview",
      applyPreviewSettings,
    );
    return () =>
      window.removeEventListener(
        "spree:theme-settings-preview",
        applyPreviewSettings,
      );
  }, []);
  const ageGateEnabled = themeSettingEnabled(
    settings?.age_verification?.enabled,
  );
  const minimumAge =
    settings?.age_verification?.minimum_age === "21" ? "21" : "18";
  useEffect(() => {
    if (ageGateEnabled)
      setAgeConfirmed(
        window.localStorage.getItem("spree-age-confirmed") === minimumAge,
      );
  }, [ageGateEnabled, minimumAge]);
  const style: Record<string, string> = {};
  const colorVariables: Record<string, string> = {
    brand: "--marketplace-brand",
    background: "--marketplace-background",
    surface: "--marketplace-surface",
    surface_subtle: "--marketplace-surface-subtle",
    surface_warm: "--marketplace-surface-warm",
    foreground: "--marketplace-foreground",
    muted: "--marketplace-muted-foreground",
    border: "--marketplace-border",
    accent: "--marketplace-accent",
    sale: "--marketplace-sale",
    success: "--marketplace-success",
    danger: "--marketplace-danger",
    form_background: "--theme-form-background",
    form_border: "--theme-form-border",
    form_text: "--theme-form-text",
    popup_overlay: "--theme-popup-overlay",
    popup_background: "--theme-popup-background",
    popup_text: "--theme-popup-text",
    arrow_background: "--theme-arrow-background",
    arrow_icon: "--theme-arrow-icon",
    checkout_banner: "--checkout-banner",
    checkout_main: "--checkout-main",
    checkout_summary: "--checkout-summary",
    checkout_text: "--checkout-text",
  };
  Object.entries(settings?.colors || {}).forEach(([key, value]) => {
    if (shouldSkipShellThemeColorKey(key)) return;
    if (colorVariables[key] && /^#[0-9a-fA-F]{6}$/.test(value))
      style[colorVariables[key]] = value;
  });
  pinStorefrontShellBackground(style);
  const radii: Record<string, string> = {
    none: "0px",
    small: "6px",
    medium: "12px",
    large: "24px",
  };
  for (const key of ["radius_sm", "radius_md", "radius_lg"]) {
    const value = settings?.shape?.[key];
    if (value && radii[value]) {
      style[`--marketplace-${key.replace("_", "-")}`] = radii[value];
      style[`--${key.replace("_", "-")}`] = radii[value];
    }
  }
  const typography = settings?.typography || {};
  const fontLibrary = typography.font_library || "system";
  const fontStacks: Record<string, { body: string; heading: string }> = {
    system: {
      body: "var(--font-sans), sans-serif",
      heading: "var(--font-display), serif",
    },
    google: {
      body: '"Roboto", sans-serif',
      heading: '"Playfair Display", serif',
    },
    shopify: {
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      heading: 'Georgia, "Times New Roman", serif',
    },
  };
  const selectedFonts = fontStacks[fontLibrary] || fontStacks.system;
  style["--marketplace-body-font"] =
    typography.body_font === "heading"
      ? selectedFonts.heading
      : selectedFonts.body;
  style["--marketplace-heading-font"] =
    typography.heading_font === "body"
      ? selectedFonts.body
      : selectedFonts.heading;
  applyNamedThemeFonts(style, typography);
  const namedFontStylesheets = themeGoogleFontStylesheets(typography);
  const fontSize: Record<string, string> = {
    small: "14px",
    medium: "16px",
    large: "18px",
  };
  if (fontSize[typography.base_size])
    style["--marketplace-base-font-size"] = fontSize[typography.base_size];
  const grid = settings?.products_grid || {};
  if (["2", "3", "4", "5"].includes(String(grid.columns)))
    style["--marketplace-product-grid-columns"] = String(grid.columns);
  if (["1", "2"].includes(String(grid.mobile_columns)))
    style["--marketplace-product-grid-mobile-columns"] = String(
      grid.mobile_columns,
    );
  const imageRatios: Record<string, string> = {
    square: "1 / 1",
    portrait: "4 / 5",
    landscape: "3 / 2",
  };
  if (typeof grid.image_ratio === "string" && imageRatios[grid.image_ratio])
    style["--marketplace-product-image-ratio"] = imageRatios[grid.image_ratio];
  const cardRadii: Record<string, string> = {
    square: "0",
    small: "var(--marketplace-radius-sm)",
    rounded: "var(--marketplace-radius-md)",
    large: "var(--marketplace-radius-lg)",
  };
  if (typeof grid.card_radius === "string" && cardRadii[grid.card_radius])
    style["--marketplace-product-card-radius"] = cardRadii[grid.card_radius];
  if (grid.card_shadow === "subtle")
    style["--marketplace-product-shadow"] = "0 1px 3px rgb(43 39 45 / 8%)";
  const radius: Record<string, string> = {
    square: "0",
    rounded: "var(--marketplace-radius-md, 0.5rem)",
    pill: "9999px",
  };
  const buttonRadius = settings?.buttons?.radius;
  if (buttonRadius && radius[buttonRadius])
    style["--marketplace-button-radius"] = radius[buttonRadius];
  const pageWidth: Record<string, string> = {
    narrow: "1080px",
    standard: "1200px",
    wide: "1440px",
    full: "100%",
  };
  if (settings?.layout?.page_width && pageWidth[settings.layout.page_width])
    style["--marketplace-page-width"] = pageWidth[settings.layout.page_width];
  const fullWidthSideMargin = Number(settings?.layout?.full_width_side_margin);
  if (Number.isFinite(fullWidthSideMargin))
    style["--marketplace-full-width-side-margin"] =
      `${Math.max(0, Math.min(120, fullWidthSideMargin))}px`;
  const sectionSpacing: Record<string, string> = {
    compact: "2rem",
    comfortable: "3rem",
    spacious: "5rem",
  };
  const sectionSpacingScales: Record<string, string> = {
    compact: "0.55",
    comfortable: "1.35",
    spacious: "2.4",
  };
  if (
    settings?.layout?.section_spacing &&
    sectionSpacing[settings.layout.section_spacing]
  ) {
    style["--cms-section-spacing"] =
      sectionSpacing[settings.layout.section_spacing];
    style["--cms-section-spacing-scale"] =
      sectionSpacingScales[settings.layout.section_spacing];
  }
  const buttonStyle: Record<string, string> = {
    solid: "var(--marketplace-brand)",
    outline: "transparent",
  };
  if (settings?.buttons?.style && buttonStyle[settings.buttons.style])
    style["--marketplace-button-background"] =
      buttonStyle[settings.buttons.style];
  if (settings?.buttons?.text_transform === "uppercase")
    style["--marketplace-button-text-transform"] = "uppercase";
  const buttonFontSize: Record<string, string> = {
    small: "0.875rem",
    medium: "1rem",
    large: "1.125rem",
  };
  if (
    settings?.buttons?.font_size &&
    buttonFontSize[settings.buttons.font_size]
  )
    style["--theme-button-font-size"] =
      buttonFontSize[settings.buttons.font_size];
  const buttonColors: Record<string, string> = {
    primary_background: "--theme-button-primary-background",
    primary_text: "--theme-button-primary-text",
    primary_border: "--theme-button-primary-border",
    secondary_background: "--theme-button-secondary-background",
    secondary_text: "--theme-button-secondary-text",
    secondary_border: "--theme-button-secondary-border",
    border_background: "--theme-button-border-background",
    border_text: "--theme-button-border-text",
    border_color: "--theme-button-border-color",
  };
  Object.entries(settings?.buttons || {}).forEach(([key, value]) => {
    if (
      buttonColors[key] &&
      typeof value === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(value)
    )
      style[buttonColors[key]] = value;
  });
  if (
    typeof settings?.buttons?.link_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(settings.buttons.link_color)
  )
    style["--theme-button-link-color"] = settings.buttons.link_color;
  const popup = settings?.popups || {};
  const popupOpacity = Math.max(
    0,
    Math.min(100, Number(popup.overlay_opacity ?? 70)),
  );
  const popupOverlay = settings?.colors?.popup_overlay;
  style["--theme-popup-overlay"] =
    typeof popupOverlay === "string" && /^#[0-9a-fA-F]{6}$/.test(popupOverlay)
      ? `color-mix(in srgb, ${popupOverlay} ${popupOpacity}%, transparent)`
      : `rgb(0 0 0 / ${popupOpacity}%)`;
  style["--theme-popup-blur"] = themeSettingEnabled(popup.background_blur)
    ? "blur(8px)"
    : "none";
  const popupRadius: Record<string, string> = {
    none: "0",
    small: "0.25rem",
    medium: "0.5rem",
    large: "1rem",
  };
  if (
    typeof popup.corner_radius === "string" &&
    popupRadius[popup.corner_radius]
  )
    style["--theme-popup-radius"] = popupRadius[popup.corner_radius];
  const cartColors: Record<string, string> = {
    background_color: "--theme-cart-background",
    text_color: "--theme-cart-text",
    border_color: "--theme-cart-border",
  };
  Object.entries(settings?.cart || {}).forEach(([key, value]) => {
    if (
      cartColors[key] &&
      typeof value === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(value)
    )
      style[cartColors[key]] = value;
  });
  const searchColors: Record<string, string> = {
    background_color: "--theme-search-background",
    text_color: "--theme-search-text",
    border_color: "--theme-search-border",
  };
  Object.entries(settings?.search || {}).forEach(([key, value]) => {
    if (
      searchColors[key] &&
      typeof value === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(value)
    )
      style[searchColors[key]] = value;
  });
  const navigationColors: Record<string, string> = {
    background_color: "--theme-navigation-background",
    text_color: "--theme-navigation-text",
    mobile_background_color: "--theme-mobile-navigation-background",
    mobile_text_color: "--theme-mobile-navigation-text",
  };
  Object.entries(settings?.navigation || {}).forEach(([key, value]) => {
    if (
      navigationColors[key] &&
      typeof value === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(value)
    )
      style[navigationColors[key]] = value;
  });
  const navigationSettings = settings?.navigation || {};
  style["--theme-navigation-font"] =
    navigationSettings.font === "heading"
      ? "var(--marketplace-heading-font)"
      : "var(--marketplace-body-font)";
  const navigationSize: Record<string, string> = {
    small: "12px",
    medium: "14px",
    large: "16px",
  };
  if (
    typeof navigationSettings.font_size === "string" &&
    navigationSize[navigationSettings.font_size]
  )
    style["--theme-navigation-font-size"] =
      navigationSize[navigationSettings.font_size];
  if (navigationSettings.text_case === "uppercase")
    style["--theme-navigation-text-transform"] = "uppercase";
  return (
    <ThemeSettingsContext.Provider value={settings || {}}>
      {namedFontStylesheets.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div
        data-theme-global-settings
        data-theme-typography-scale={
          themeTypographyScaleCustomized(typography) ? "custom" : undefined
        }
        data-theme-global-social-links={
          themeSettingEnabled(settings?.social?.show_social_links, true)
            ? "true"
            : "false"
        }
        data-theme-global-wishlist={
          themeSettingEnabled(settings?.general?.enable_wishlist, true)
            ? "true"
            : "false"
        }
        data-theme-global-animations={
          !themeSettingEnabled(settings?.animations?.enabled, true) ||
          settings?.animations?.style === "none"
            ? "false"
            : "true"
        }
        data-theme-global-animation-style={
          settings?.animations?.style || "subtle"
        }
        data-theme-global-navigation-sticky={
          themeSettingEnabled(settings?.navigation?.sticky) ? "true" : "false"
        }
        data-theme-global-navigation-style={
          settings?.navigation?.style || "dropdown"
        }
        data-theme-global-button-style={settings?.buttons?.style || "solid"}
        data-theme-global-mobile-navigation-style={
          settings?.navigation?.mobile_style || "drawer"
        }
        data-theme-global-search-style={
          settings?.search?.drawer_style || "drawer"
        }
        data-theme-global-search-title={
          settings?.search?.drawer_title || "Search"
        }
        data-theme-global-page-title-font={
          settings?.typography?.page_title_font === "body" ||
          settings?.typography?.page_title_font === "heading"
            ? settings.typography.page_title_font
            : undefined
        }
        data-theme-global-page-title-size={
          settings?.typography?.page_title_size === "small" ||
          settings?.typography?.page_title_size === "medium" ||
          settings?.typography?.page_title_size === "large"
            ? settings.typography.page_title_size
            : undefined
        }
        data-theme-global-product-swatches={
          themeSettingEnabled(settings?.product_swatches?.enabled)
            ? "true"
            : "false"
        }
        data-theme-global-size-chart={
          themeSettingEnabled(settings?.size_chart?.enabled) ? "true" : "false"
        }
        data-theme-global-collection-banner={
          themeSettingEnabled(settings?.collection_page?.show_banner, true)
            ? "true"
            : "false"
        }
        data-theme-global-collection-breadcrumbs={
          themeSettingEnabled(settings?.collection_page?.show_breadcrumbs, true)
            ? "true"
            : "false"
        }
        data-theme-global-listing-toolbar={
          themeSettingEnabled(settings?.collection_page?.show_toolbar, true)
            ? "true"
            : "false"
        }
        data-theme-global-collection-filters={
          themeSettingEnabled(
            settings?.collection_page?.show_filter_sidebar,
            true,
          )
            ? "true"
            : "false"
        }
        data-theme-global-sticky-cart={
          themeSettingEnabled(settings?.product_page?.sticky_cart)
            ? "true"
            : "false"
        }
        data-theme-global-arrows={
          themeSettingEnabled(settings?.products_grid?.show_arrows, true)
            ? "true"
            : "false"
        }
        style={
          {
            ...style,
            fontFamily: "var(--marketplace-body-font)",
            fontSize:
              "var(--marketplace-body-size, var(--marketplace-base-font-size, inherit))",
            display: "contents",
          } as CSSProperties
        }
      >
        <div
          className="flex min-h-screen flex-1 flex-col"
          inert={ageGateEnabled && !ageConfirmed}
          aria-hidden={ageGateEnabled && !ageConfirmed}
        >
          {children}
        </div>
        {ageGateEnabled && !ageConfirmed && (
          <div
            className="fixed inset-0 z-[100] grid place-items-center p-4"
            style={{
              backgroundColor: "var(--theme-popup-overlay, rgb(0 0 0 / 70%))",
              backdropFilter: "var(--theme-popup-blur, none)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-age-gate-title"
          >
            <div
              className="w-full max-w-md p-6 text-center shadow-xl"
              style={{
                backgroundColor: "var(--theme-popup-background, white)",
                color: "var(--theme-popup-text, #111827)",
                borderRadius: "var(--theme-popup-radius, 0.5rem)",
              }}
            >
              <h2 id="store-age-gate-title" className="text-xl font-semibold">
                {String(
                  settings?.age_verification?.title || "Age verification",
                )}
              </h2>
              <p className="mt-3 text-sm">
                {String(
                  settings?.age_verification?.message ||
                    `You must be at least ${minimumAge} years old to enter this store.`,
                )}
              </p>
              <button
                type="button"
                className="mt-6 w-full rounded-md bg-[var(--marketplace-brand)] px-4 py-3 font-medium text-white"
                onClick={() => {
                  window.localStorage.setItem(
                    "spree-age-confirmed",
                    minimumAge,
                  );
                  setAgeConfirmed(true);
                }}
              >
                {String(
                  settings?.age_verification?.confirm_label ||
                    `I am at least ${minimumAge}`,
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </ThemeSettingsContext.Provider>
  );
}

export function useStoreThemeSettings() {
  return useContext(ThemeSettingsContext);
}
