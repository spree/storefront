import type { Category } from "@spree/sdk";
import dynamic from "next/dynamic";
import type { CSSProperties, ReactNode } from "react";
import { MarketplaceCategoryRow } from "@/components/layout/MarketplaceCategoryRow";
import { MarketplaceHeaderActions } from "@/components/layout/MarketplaceHeaderActions";
import { ScrollUpHeader } from "@/components/layout/ScrollUpHeader";
import { StoreBrandLogo } from "@/components/layout/StoreBrandLogo";
import { SearchBar } from "@/components/search/SearchBar";
import type {
  CmsNavigationItem,
  CmsNavigationPayload,
} from "@/lib/data/cms-navigation";
import { isWholesaleEnabled } from "@/lib/spree";
import { themeSettingEnabled } from "@/lib/theme/setting-value";

const LazyMobileMenu = dynamic(
  () =>
    import("@/components/layout/MobileMenu").then((mod) => ({
      default: mod.MobileMenu,
    })),
  {
    loading: () => (
      <div className="inline-flex items-center justify-center h-10 w-10" />
    ),
  },
);

interface HeaderProps {
  basePath: string;
  locale: Locale;
  mobileNavigation: ReactNode;
  sticky?: boolean;
  hideLogo?: boolean;
  logoPaddingTop?: number;
  logoPaddingBottom?: number;
  logoImageUrl?: string;
  logoImageAlt?: string;
  menuSettings?: Record<string, unknown>;
  headerSettings?: Record<string, unknown>;
  rootCategories?: Category[];
  categoryMenuItems?: CmsNavigationItem[];
  categoryMenuSettings?: CmsNavigationPayload["settings"];
  forYouCategoryIds?: string[];
  categoryMenuKey?: string;
  hideCategoryRow?: boolean;
  showCountryRegionSelector?: boolean;
  showLanguageSelector?: boolean;
  transparent?: boolean;
  mobileProductLayout?: boolean;
}

interface HeaderMobileMenuProps {
  rootCategories: Category[];
  basePath: string;
  menuSettings?: Record<string, unknown>;
  cmsNavigation?: CmsNavigationPayload | null;
  forYouCategoryIds?: string[];
}

export function HeaderMobileMenu({
  rootCategories,
  basePath,
  menuSettings = {},
  cmsNavigation,
  forYouCategoryIds = [],
}: HeaderMobileMenuProps) {
  const menuBackgroundColor = themeMenuColor(
    menuSettings.background_color,
    "background",
  );
  const menuTextColor = themeMenuColor(menuSettings.text_color, "text");
  return (
    <LazyMobileMenu
      rootCategories={rootCategories}
      basePath={basePath}
      wholesaleEnabled={isWholesaleEnabled()}
      accordionNavigation={
        typeof menuSettings.mobile_accordion === "boolean" ||
        typeof menuSettings.mobile_accordion === "string"
          ? themeSettingEnabled(menuSettings.mobile_accordion)
          : undefined
      }
      showNavigationBar={themeSettingEnabled(
        menuSettings.mobile_navigation_bar,
      )}
      showDividers={themeSettingEnabled(menuSettings.mobile_dividers)}
      menuBackgroundColor={menuBackgroundColor}
      menuTextColor={menuTextColor}
      cmsItems={cmsNavigation?.items}
      cmsSettings={cmsNavigation?.settings}
      forYouCategoryIds={forYouCategoryIds}
    />
  );
}

function themeMenuColor(value: unknown, role: "background" | "text") {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value))
    return value;
  if (value === "palette")
    return role === "background"
      ? "var(--marketplace-surface-warm)"
      : "var(--marketplace-foreground)";
  return undefined;
}

export async function Header({
  basePath,
  locale,
  mobileNavigation,
  sticky = true,
  hideLogo = false,
  logoPaddingTop = 0,
  logoPaddingBottom = 0,
  logoImageUrl,
  logoImageAlt,
  menuSettings = {},
  headerSettings = {},
  rootCategories = [],
  categoryMenuItems = [],
  categoryMenuSettings,
  forYouCategoryIds = [],
  categoryMenuKey,
  hideCategoryRow = false,
  transparent = false,
  mobileProductLayout = false,
}: HeaderProps) {
  const backgroundColor = themeMenuColor(
    menuSettings.background_color,
    "background",
  );
  const menuTextColor = themeMenuColor(menuSettings.text_color, "text");
  const textColor =
    menuTextColor || themeMenuColor(headerSettings.text_color, "text");
  const headerFontFamily =
    headerSettings.font === "heading"
      ? "var(--font-display), serif"
      : headerSettings.font === "subheading"
        ? "var(--font-display), sans-serif"
        : headerSettings.font === "body"
          ? "var(--font-sans), sans-serif"
          : undefined;
  const headerFontSize =
    typeof headerSettings.size === "string" &&
    /^(12|14|16|18|20)px$/.test(headerSettings.size)
      ? headerSettings.size
      : "14px";
  const headerStyle = {
    ...(transparent && !backgroundColor
      ? { backgroundColor: "transparent" }
      : backgroundColor
        ? { backgroundColor }
        : {}),
    ...(textColor ? { color: textColor } : {}),
    ...(headerFontSize ? { fontSize: headerFontSize } : {}),
    ...(headerFontFamily ? { fontFamily: headerFontFamily } : {}),
    ...(menuSettings.text_case === "uppercase"
      ? { textTransform: "uppercase" as const }
      : {}),
  } as CSSProperties;
  const searchEnabled = themeSettingEnabled(
    headerSettings.search_enabled,
    true,
  );
  const headerLayout = [
    "inline",
    "big_search",
    "menu_bottom",
    "hamburger",
  ].includes(String(headerSettings.header_style))
    ? String(headerSettings.header_style)
    : "inline";
  const customerAccount = themeSettingEnabled(
    headerSettings.customer_account,
    true,
  );
  const compact = headerSettings.height === "compact";
  const maxWidth =
    headerSettings.section_width === "page"
      ? "var(--marketplace-page-width, 1200px)"
      : "1400px";
  const divider = Math.max(
    0,
    Math.min(8, Number(headerSettings.divider_thickness ?? 0)),
  );
  const dividerStyle = {
    borderColor: "var(--marketplace-header-border)",
    borderBottomWidth: `${divider}px`,
  };
  const logoPosition =
    headerSettings.logo_position === "center"
      ? "center"
      : headerSettings.logo_position === "right"
        ? "right"
        : "left";
  const searchPosition =
    headerSettings.search_position === "left" ? "left" : "right";
  const logoColor =
    typeof headerSettings.logo_color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(headerSettings.logo_color)
      ? headerSettings.logo_color
      : undefined;
  const categoryRowHidden =
    hideCategoryRow ||
    headerSettings.show_category_row === false ||
    headerSettings.show_category_row === "false" ||
    headerLayout === "hamburger";
  const categoryRow = (
    <div
      data-theme-category-row
      className="relative z-0 hidden border-b border-marketplace-border bg-marketplace-surface-warm py-2 md:block"
      style={{
        backgroundColor: backgroundColor ?? undefined,
        color: textColor,
        display: categoryRowHidden ? "none" : undefined,
      }}
    >
      <MarketplaceCategoryRow
        basePath={basePath}
        categories={rootCategories}
        menuItems={categoryMenuItems}
        menuKey={String(
          categoryMenuKey ||
            menuSettings.menu_key ||
            headerSettings.menu_key ||
            "header",
        )}
        menuSettings={categoryMenuSettings}
        forYouCategoryIds={forYouCategoryIds}
      />
    </div>
  );
  const menuOnTop =
    headerLayout !== "menu_bottom" && headerSettings.menu_row === "top";
  const searchOnBottom = headerSettings.search_row === "bottom";
  const accountOnBottom = headerSettings.account_row === "bottom";
  const inlineMobileSearch =
    mobileProductLayout &&
    searchEnabled &&
    headerLayout === "inline" &&
    !searchOnBottom;

  const headerContent = (
    <header
      data-theme-header="true"
      data-pdp-mobile-header={mobileProductLayout ? "true" : undefined}
      data-theme-base-path={basePath}
      data-header-style={headerLayout}
      data-transparent={transparent ? "true" : "false"}
      data-sticky-enabled={sticky ? "true" : "false"}
      data-sticky-behavior={String(headerSettings.sticky_behavior || "always")}
      data-logo-position={logoPosition}
      data-menu-position={String(headerSettings.menu_position || "center")}
      data-menu-row={String(headerSettings.menu_row || "bottom")}
      data-search-position={searchPosition}
      data-search-row={String(headerSettings.search_row || "top")}
      data-account-position={String(headerSettings.account_position || "right")}
      data-account-row={String(headerSettings.account_row || "top")}
      data-menu-style={String(headerSettings.menu_style || "items")}
      className={`${transparent ? "absolute inset-x-0 bg-transparent" : "relative"} top-0 z-50 ${transparent ? "" : "bg-marketplace-header-surface"} text-marketplace-foreground`}
      style={headerStyle}
    >
      {menuOnTop ? categoryRow : null}
      <div data-theme-header-main style={dividerStyle} className="border-b">
        <div
          className={`mx-auto flex max-w-[1400px] items-center ${mobileProductLayout ? "gap-1.5 px-3 sm:gap-4" : "gap-2 px-4 sm:gap-4"} ${headerLayout === "big_search" || searchOnBottom || accountOnBottom ? "flex-wrap" : ""} ${compact ? "py-1.5" : "py-2.5 sm:py-3"} lg:px-6`}
          style={{ maxWidth }}
        >
          <div
            data-theme-header-logo
            className="flex shrink-0 items-center gap-1.5 sm:gap-2"
            style={{
              paddingTop: `${logoPaddingTop}px`,
              paddingBottom: `${logoPaddingBottom}px`,
              display: hideLogo ? "none" : undefined,
              order:
                logoPosition === "left" ? 0 : logoPosition === "center" ? 2 : 4,
              marginInline: logoPosition === "center" ? "auto" : undefined,
              color: logoColor,
            }}
          >
            <div
              data-theme-header-mobile-menu
              className={headerLayout === "hamburger" ? "flex" : "md:hidden"}
            >
              {mobileNavigation}
            </div>
            <StoreBrandLogo
              basePath={basePath}
              compact
              appearance="etsy"
              logoImageUrl={logoImageUrl}
              logoImageAlt={logoImageAlt}
              logoColor={logoColor}
            />
          </div>

          <search
            data-theme-header-search
            className={`relative z-30 ${headerLayout === "big_search" || searchOnBottom ? "basis-full" : inlineMobileSearch ? "flex min-w-0 flex-1 md:block" : "hidden min-w-0 flex-1 md:block"}`}
            style={{
              order:
                headerLayout === "big_search" || searchOnBottom
                  ? 6
                  : searchPosition === "left"
                    ? 1
                    : 3,
              display: searchEnabled ? undefined : "none",
            }}
          >
            <SearchBar basePath={basePath} appearance="etsy" />
          </search>

          <div
            data-theme-header-actions
            className={`${accountOnBottom ? "order-last basis-full flex" : headerSettings.account_position === "left" ? "" : "ml-auto"} min-w-0`}
            style={{
              order: accountOnBottom
                ? 6
                : headerSettings.account_position === "left"
                  ? 1
                  : 5,
              marginLeft:
                !accountOnBottom && headerSettings.account_position === "left"
                  ? 0
                  : undefined,
              justifyContent:
                headerSettings.account_position === "left"
                  ? "flex-start"
                  : "flex-end",
            }}
          >
            <MarketplaceHeaderActions
              basePath={basePath}
              sellLabel="Sell"
              variant="etsy"
              showAccount={customerAccount}
            />
          </div>
        </div>

        {headerLayout !== "big_search" && (
          <div
            data-theme-header-mobile-search
            className={
              inlineMobileSearch ? "hidden" : "mx-auto px-4 pb-3 md:hidden"
            }
            style={{ maxWidth, display: searchEnabled ? undefined : "none" }}
          >
            <SearchBar basePath={basePath} appearance="etsy" />
          </div>
        )}
      </div>
      {!menuOnTop ? categoryRow : null}
    </header>
  );
  return (
    <ScrollUpHeader sticky={sticky && !transparent}>
      {headerContent}
    </ScrollUpHeader>
  );
}
