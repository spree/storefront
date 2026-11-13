import type { CmsTheme } from "@spree/sdk";
import {
  applyNamedThemeFonts,
  themeTypographyScaleCustomized,
} from "@/components/theme/theme-fonts";
import { themeSettingEnabled } from "@/lib/theme/setting-value";

type SettingsGroup = Record<string, unknown>;

/** Page shell and default section canvas stay white; theme cream tokens do not override. */
export const STOREFRONT_SHELL_BACKGROUND = "#ffffff";

const SHELL_COLOR_KEYS_SKIP = new Set([
  "background",
  "surface_warm",
  "surface_subtle",
]);

export function shouldSkipShellThemeColorKey(key: string) {
  return SHELL_COLOR_KEYS_SKIP.has(key);
}

export function pinStorefrontShellBackground(style: Record<string, string>) {
  style["--marketplace-background"] = STOREFRONT_SHELL_BACKGROUND;
  style["--marketplace-canvas"] = STOREFRONT_SHELL_BACKGROUND;
  style["--marketplace-surface"] = STOREFRONT_SHELL_BACKGROUND;
  style["--marketplace-surface-warm"] = STOREFRONT_SHELL_BACKGROUND;
  style["--marketplace-surface-subtle"] = "#f4f4f5";
  style["--marketplace-muted"] = "#f4f4f5";
}

export function themeGlobalDataAttributes(
  theme?: CmsTheme | null,
): Record<string, string> {
  const settings = (theme?.settings || {}) as CmsTheme["settings"] &
    Record<string, SettingsGroup>;
  const enabled = (group: string, key: string, defaultValue = true) =>
    themeSettingEnabled(settings[group]?.[key], defaultValue)
      ? "true"
      : "false";
  return {
    "data-theme-global-settings": "",
    ...(themeTypographyScaleCustomized(settings.typography)
      ? { "data-theme-typography-scale": "custom" }
      : {}),
    "data-theme-global-social-links": enabled("social", "show_social_links"),
    "data-theme-global-wishlist": enabled("general", "enable_wishlist"),
    "data-theme-global-animations":
      !themeSettingEnabled(settings.animations?.enabled, true) ||
      settings.animations?.style === "none"
        ? "false"
        : "true",
    "data-theme-global-animation-style": String(
      settings.animations?.style || "subtle",
    ),
    "data-theme-global-navigation-sticky": enabled(
      "navigation",
      "sticky",
      false,
    ),
    "data-theme-global-navigation-style": String(
      settings.navigation?.style || "dropdown",
    ),
    "data-theme-global-button-style": String(
      settings.buttons?.style || "solid",
    ),
    "data-theme-global-mobile-navigation-style": String(
      settings.navigation?.mobile_style || "drawer",
    ),
    "data-theme-global-search-style": String(
      settings.search?.drawer_style || "drawer",
    ),
    "data-theme-global-search-title": String(
      settings.search?.drawer_title || "Search",
    ),
    ...(settings.typography?.page_title_font === "body" ||
    settings.typography?.page_title_font === "heading"
      ? {
          "data-theme-global-page-title-font":
            settings.typography.page_title_font,
        }
      : {}),
    ...(settings.typography?.page_title_size === "small" ||
    settings.typography?.page_title_size === "medium" ||
    settings.typography?.page_title_size === "large"
      ? {
          "data-theme-global-page-title-size":
            settings.typography.page_title_size,
        }
      : {}),
    "data-theme-global-product-swatches": enabled(
      "product_swatches",
      "enabled",
      false,
    ),
    "data-theme-global-size-chart": enabled("size_chart", "enabled", false),
    "data-theme-global-collection-banner": enabled(
      "collection_page",
      "show_banner",
    ),
    "data-theme-global-collection-breadcrumbs": enabled(
      "collection_page",
      "show_breadcrumbs",
    ),
    "data-theme-global-listing-toolbar": enabled(
      "collection_page",
      "show_toolbar",
    ),
    "data-theme-global-collection-filters": enabled(
      "collection_page",
      "show_filter_sidebar",
    ),
    "data-theme-global-sticky-cart": enabled(
      "product_page",
      "sticky_cart",
      false,
    ),
    "data-theme-global-arrows": enabled("products_grid", "show_arrows"),
  };
}

export function themeInlineStyle(theme?: CmsTheme | null): React.CSSProperties {
  const settings = (theme?.settings || {}) as CmsTheme["settings"] &
    Record<string, SettingsGroup>;
  const style: Record<string, string> = {};
  const colors = settings.colors || {};
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
    checkout_banner: "--checkout-banner",
    checkout_main: "--checkout-main",
    checkout_summary: "--checkout-summary",
    checkout_text: "--checkout-text",
    form_background: "--theme-form-background",
    form_border: "--theme-form-border",
    form_text: "--theme-form-text",
    popup_background: "--theme-popup-background",
    popup_text: "--theme-popup-text",
    arrow_background: "--theme-arrow-background",
    arrow_icon: "--theme-arrow-icon",
  };
  for (const [key, variable] of Object.entries(colorVariables)) {
    if (shouldSkipShellThemeColorKey(key)) continue;
    const value = colors[key];
    if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value))
      style[variable] = value;
  }

  const radii: Record<string, string> = {
    none: "0px",
    small: "6px",
    medium: "12px",
    large: "24px",
  };
  for (const key of ["radius_sm", "radius_md", "radius_lg"]) {
    const value = settings.shape?.[key];
    if (typeof value === "string" && radii[value]) {
      const size = radii[value];
      style[`--marketplace-${key.replace("_", "-")}`] = size;
      style[`--${key.replace("_", "-")}`] = size;
    }
  }
  const spacing: Record<string, string> = {
    compact: "2rem",
    comfortable: "3rem",
    spacious: "5rem",
  };
  const pageWidths: Record<string, string> = {
    narrow: "1080px",
    standard: "1200px",
    wide: "1440px",
    full: "100%",
  };
  const sectionSpacing = String(settings.layout?.section_spacing || "");
  style["--cms-section-spacing"] =
    spacing[sectionSpacing] || spacing.comfortable;
  const spacingScales: Record<string, string> = {
    compact: "0.55",
    comfortable: "1.35",
    spacious: "2.4",
  };
  if (spacingScales[sectionSpacing])
    style["--cms-section-spacing-scale"] = spacingScales[sectionSpacing];
  if (pageWidths[String(settings.layout?.page_width)])
    style["--marketplace-page-width"] =
      pageWidths[String(settings.layout?.page_width)];
  const fullWidthSideMargin = Number(settings.layout?.full_width_side_margin);
  if (Number.isFinite(fullWidthSideMargin))
    style["--marketplace-full-width-side-margin"] =
      `${Math.max(0, Math.min(120, fullWidthSideMargin))}px`;
  const typography = settings.typography || {};
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
  const selectedFonts =
    fontStacks[String(typography.font_library)] || fontStacks.system;
  style["--marketplace-body-font"] =
    typography.body_font === "heading"
      ? selectedFonts.heading
      : selectedFonts.body;
  style["--marketplace-heading-font"] =
    typography.heading_font === "body"
      ? selectedFonts.body
      : selectedFonts.heading;
  applyNamedThemeFonts(style, typography);
  const fontSizes: Record<string, string> = {
    small: "14px",
    medium: "16px",
    large: "18px",
  };
  if (fontSizes[String(typography.base_size)])
    style["--marketplace-base-font-size"] =
      fontSizes[String(typography.base_size)];
  style.fontFamily = "var(--marketplace-body-font)";
  style.fontSize =
    "var(--marketplace-body-size, var(--marketplace-base-font-size, inherit))";

  const grid = settings.products_grid || {};
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
  if (imageRatios[String(grid.image_ratio)])
    style["--marketplace-product-image-ratio"] =
      imageRatios[String(grid.image_ratio)];
  const cardRadii: Record<string, string> = {
    square: "0",
    small: "var(--marketplace-radius-sm)",
    rounded: "var(--marketplace-radius-md)",
    large: "var(--marketplace-radius-lg)",
  };
  if (cardRadii[String(grid.card_radius)])
    style["--marketplace-product-card-radius"] =
      cardRadii[String(grid.card_radius)];
  if (grid.card_shadow === "subtle")
    style["--marketplace-product-shadow"] = "0 1px 3px rgb(43 39 45 / 8%)";

  const buttons = settings.buttons || {};
  const buttonRadii: Record<string, string> = {
    square: "0",
    rounded: "var(--marketplace-radius-md, 0.5rem)",
    pill: "9999px",
  };
  if (buttonRadii[String(buttons.radius)])
    style["--marketplace-button-radius"] = buttonRadii[String(buttons.radius)];
  const buttonStyles: Record<string, string> = {
    solid: "var(--marketplace-brand)",
    outline: "transparent",
  };
  if (buttonStyles[String(buttons.style)])
    style["--marketplace-button-background"] =
      buttonStyles[String(buttons.style)];
  if (buttons.text_transform === "uppercase")
    style["--marketplace-button-text-transform"] = "uppercase";
  const buttonFontSizes: Record<string, string> = {
    small: "0.875rem",
    medium: "1rem",
    large: "1.125rem",
  };
  if (buttonFontSizes[String(buttons.font_size)])
    style["--theme-button-font-size"] =
      buttonFontSizes[String(buttons.font_size)];
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
    link_color: "--theme-button-link-color",
  };
  for (const [key, variable] of Object.entries(buttonColors)) {
    const value = buttons[key];
    if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value))
      style[variable] = value;
  }

  const popup = settings.popups || {};
  const popupOpacity = Math.max(
    0,
    Math.min(100, Number(popup.overlay_opacity ?? 70)),
  );
  const popupOverlay = colors.popup_overlay;
  style["--theme-popup-overlay"] =
    typeof popupOverlay === "string" && /^#[0-9a-fA-F]{6}$/.test(popupOverlay)
      ? `color-mix(in srgb, ${popupOverlay} ${popupOpacity}%, transparent)`
      : `rgb(0 0 0 / ${popupOpacity}%)`;
  style["--theme-popup-blur"] = themeSettingEnabled(popup.background_blur)
    ? "blur(8px)"
    : "none";
  const popupRadii: Record<string, string> = {
    none: "0",
    small: "0.25rem",
    medium: "0.5rem",
    large: "1rem",
  };
  if (popupRadii[String(popup.corner_radius)])
    style["--theme-popup-radius"] = popupRadii[String(popup.corner_radius)];

  const coloredGroups: Array<
    [SettingsGroup | undefined, Record<string, string>]
  > = [
    [
      settings.cart,
      {
        background_color: "--theme-cart-background",
        text_color: "--theme-cart-text",
        border_color: "--theme-cart-border",
      },
    ],
    [
      settings.search,
      {
        background_color: "--theme-search-background",
        text_color: "--theme-search-text",
        border_color: "--theme-search-border",
      },
    ],
    [
      settings.navigation,
      {
        background_color: "--theme-navigation-background",
        text_color: "--theme-navigation-text",
        mobile_background_color: "--theme-mobile-navigation-background",
        mobile_text_color: "--theme-mobile-navigation-text",
      },
    ],
  ];
  for (const [group, variables] of coloredGroups) {
    for (const [key, variable] of Object.entries(variables)) {
      const value = group?.[key];
      if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value))
        style[variable] = value;
    }
  }
  const navigation = settings.navigation || {};
  style["--theme-navigation-font"] =
    navigation.font === "heading"
      ? "var(--marketplace-heading-font)"
      : "var(--marketplace-body-font)";
  const navigationSizes: Record<string, string> = {
    small: "12px",
    medium: "14px",
    large: "16px",
  };
  if (navigationSizes[String(navigation.font_size)])
    style["--theme-navigation-font-size"] =
      navigationSizes[String(navigation.font_size)];
  if (navigation.text_case === "uppercase")
    style["--theme-navigation-text-transform"] = "uppercase";
  pinStorefrontShellBackground(style);
  return style;
}
