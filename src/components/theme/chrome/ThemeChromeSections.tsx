import type { Category } from "@spree/sdk";
import Link from "next/link";
import { cache, Suspense } from "react";
import { Footer, FooterCategoryLinks } from "@/components/layout/Footer";
import { Header, HeaderMobileMenu } from "@/components/layout/Header";
import { MarketplaceCategoryRow } from "@/components/layout/MarketplaceCategoryRow";
import { ThemeAnnouncementRotator } from "@/components/theme/chrome/ThemeAnnouncementRotator";
import { ThemeBlockRenderer } from "@/components/theme/ThemeBlockRenderer";
import { getCategoryNavigationTree } from "@/lib/data/categories";
import { getPublishedNavigation } from "@/lib/data/cms-navigation";
import { getPersonalizationInterestSummary } from "@/lib/data/storefront-personalization";
import { resolveThemeSetting } from "@/lib/theme/dynamic-source";
import { themeSettingEnabled } from "@/lib/theme/setting-value";
import type {
  ThemeRenderContext,
  ThemeSectionInstance,
} from "@/lib/theme/types";

function boolSetting(
  settings: Record<string, unknown>,
  key: string,
  defaultValue: boolean,
): boolean {
  return themeSettingEnabled(settings[key], defaultValue);
}

function MobileNavigationFallback() {
  return (
    <div
      aria-hidden="true"
      className="size-10 rounded-md bg-gray-100 animate-pulse motion-reduce:animate-none"
    />
  );
}

function FooterCategoryLinksFallback() {
  return (
    <li aria-hidden="true">
      <span className="block h-4 w-24 rounded bg-white/10 animate-pulse motion-reduce:animate-none" />
    </li>
  );
}

const loadRootCategories = cache(
  async (country: string, locale: string): Promise<Category[]> => {
    try {
      return await getCategoryNavigationTree({ country, locale });
    } catch {
      return [];
    }
  },
);

const loadHeaderNavigation = cache(
  async (country: string, locale: string, menuKey: string) => {
    const [categories, menu] = await Promise.all([
      loadRootCategories(country, locale),
      getPublishedNavigation(menuKey),
    ]);
    const interests = menu?.settings?.show_for_you
      ? await getPersonalizationInterestSummary()
      : null;
    return {
      categories,
      menu,
      forYouCategoryIds: interests?.top_category_ids || [],
    };
  },
);

async function ThemeHeaderNavigation({
  context,
  menuSettings,
  menuKey,
  mobile = false,
}: {
  context: ThemeRenderContext;
  menuSettings: Record<string, unknown>;
  menuKey: string;
  mobile?: boolean;
}) {
  const { categories, menu, forYouCategoryIds } = await loadHeaderNavigation(
    context.country,
    context.locale,
    menuKey,
  );
  if (mobile) {
    return (
      <HeaderMobileMenu
        rootCategories={categories}
        basePath={context.basePath}
        menuSettings={menuSettings}
        cmsNavigation={menu}
        forYouCategoryIds={forYouCategoryIds}
      />
    );
  }
  return (
    <MarketplaceCategoryRow
      basePath={context.basePath}
      categories={categories}
      menuItems={menu?.items}
      menuKey={menuKey}
      menuSettings={menu?.settings}
      forYouCategoryIds={forYouCategoryIds}
    />
  );
}

async function ThemeFooterCategoryLinks({
  context,
}: {
  context: ThemeRenderContext;
}) {
  const categories = await loadRootCategories(context.country, context.locale);
  return (
    <FooterCategoryLinks
      rootCategories={categories}
      basePath={context.basePath}
    />
  );
}

export function ThemeAnnouncementSection({
  section,
  context,
}: {
  section: ThemeSectionInstance;
  context: ThemeRenderContext;
}) {
  const settings = section.settings || {};
  const text = String(resolveThemeSetting(settings.text, context, ""));
  const link = typeof settings.link === "string" ? settings.link : "";
  const blocks = (section.block_order || [])
    .map((id) => ({ id, block: section.blocks[id] }))
    .filter((item) => item.block && !item.block.disabled);
  const style = settings.style === "accent" ? "accent" : "default";
  if (!text && blocks.length === 0) return null;

  const numericSetting = (key: string, fallback: number, max: number) => {
    const value = Number(settings[key]);
    return Number.isFinite(value)
      ? Math.max(0, Math.min(max, value))
      : fallback;
  };
  const safeColor = (key: string, fallback: string) => {
    const value = settings[key];
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
      ? value
      : fallback;
  };
  const scheme = String(settings.color_scheme || "scheme-1");
  const schemes: Record<string, { background: string; text: string }> = {
    "scheme-1": { background: "#ffffff", text: "#111111" },
    "scheme-2": { background: "#f6f1e8", text: "#6c315d" },
    "scheme-3": { background: "#e8f4ef", text: "#173b32" },
    "scheme-4": { background: "#f0f3fa", text: "#24365f" },
    "scheme-5": { background: "#fff5e8", text: "#804a19" },
  };
  const palette = schemes[scheme] || schemes["scheme-1"];
  const className = style === "accent" ? "bg-marketplace-brand text-white" : "";
  const sectionStyle: React.CSSProperties = {
    backgroundColor:
      style === "accent"
        ? undefined
        : safeColor("background_color", palette.background),
    color:
      style === "accent" ? undefined : safeColor("text_color", palette.text),
    borderBottom: `${numericSetting("divider_thickness", 1, 8)}px solid ${safeColor("divider_color", "#e1e3df")}`,
    paddingTop: `${numericSetting("padding_top", 15, 120)}px`,
    paddingBottom: `${numericSetting("padding_bottom", 15, 120)}px`,
    paddingInline: "1rem",
    width: "100%",
    maxWidth:
      settings.section_width === "full"
        ? undefined
        : "var(--marketplace-page-width, 1200px)",
    marginInline: "auto",
    textAlign: "center",
  };

  const body = <span>{text}</span>;
  const messages =
    blocks.length > 0
      ? blocks.map(({ id, block }) => (
          <div
            key={id}
            data-theme-block-id={id}
            data-theme-block-type={block.type}
          >
            <ThemeBlockRenderer block={block} context={context} />
          </div>
        ))
      : [
          link ? (
            <Link
              key="announcement"
              href={link.startsWith("/") ? link : `/${link}`}
              className="underline-offset-2 hover:underline"
            >
              {body}
            </Link>
          ) : (
            body
          ),
        ];
  const sectionId = `theme-section-${section.section_id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cssInput =
    typeof settings.custom_css === "string" ? settings.custom_css : "";
  const customCss =
    /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(cssInput)
      ? ""
      : cssInput.replace(
          /([^{}]+)\{([^{}]*)\}/g,
          (_rule, selectors: string, declarations: string) => {
            if (selectors.trim().startsWith("@")) return "";
            return `${selectors
              .split(",")
              .map((selector) => `#${sectionId} ${selector.trim()}`)
              .join(", ")} {${declarations}}`;
          },
        );

  return (
    <>
      {customCss && <style>{customCss}</style>}
      <div
        id={sectionId}
        className={`${className} text-center text-sm`}
        style={sectionStyle}
        data-theme-section-type="announcement_bar"
        data-announcement-interval={numericSetting(
          "announcement_interval",
          5,
          60,
        )}
      >
        <ThemeAnnouncementRotator
          messages={messages}
          intervalSeconds={numericSetting("announcement_interval", 5, 60)}
        />
      </div>
    </>
  );
}

export function ThemeHeaderSection({
  section,
  context,
}: {
  section: ThemeSectionInstance;
  context: ThemeRenderContext;
}) {
  const settings = section.settings || {};
  const sticky =
    settings.sticky_behavior === "never"
      ? false
      : boolSetting(settings, "sticky", true);
  const logo = section.block_order
    .map((id) => section.blocks[id])
    .find((block) => block?.type === "header_logo");
  const menu = section.block_order
    .map((id) => section.blocks[id])
    .find((block) => block?.type === "header_menu");
  const logoSettings = logo?.settings || {};
  const menuSettings = menu?.settings || {};
  const sectionId = `theme-header-${section.section_id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cssInput =
    typeof settings.custom_css === "string" ? settings.custom_css : "";
  const customCss =
    /@import|url\s*\(|expression\s*\(|<\/style|javascript:/i.test(cssInput)
      ? ""
      : cssInput.replace(
          /([^{}]+)\{([^{}]*)\}/g,
          (_rule, selectors: string, declarations: string) => {
            if (selectors.trim().startsWith("@")) return "";
            return `${selectors
              .split(",")
              .map((selector) => `#${sectionId} ${selector.trim()}`)
              .join(", ")} {${declarations}}`;
          },
        );
  const menuKey = String(
    menuSettings.menu_key || settings.menu_key || "header",
  );
  const transparent =
    context.kind === "home"
      ? boolSetting(settings, "transparent_home", false)
      : context.kind === "product"
        ? boolSetting(settings, "transparent_product", false)
        : context.kind === "collection" || context.kind === "category"
          ? boolSetting(settings, "transparent_collection", false)
          : false;

  return (
    <>
      {customCss && <style>{customCss}</style>}
      <div
        id={sectionId}
        data-theme-section-type="theme_header"
        data-theme-context-kind={context.kind}
        className={sticky ? undefined : "relative"}
      >
        <Header
          basePath={context.basePath}
          locale={context.locale as Locale}
          sticky={sticky}
          hideLogo={
            context.kind === "home" &&
            !sticky &&
            themeSettingEnabled(logoSettings.hide_on_home_page)
          }
          logoPaddingTop={Number(logoSettings.desktop_padding_top || 0)}
          logoPaddingBottom={Number(logoSettings.desktop_padding_bottom || 0)}
          logoImageUrl={
            typeof logoSettings.logo_image_url === "string"
              ? logoSettings.logo_image_url
              : undefined
          }
          logoImageAlt={
            typeof logoSettings.logo_image_alt === "string"
              ? logoSettings.logo_image_alt
              : undefined
          }
          menuSettings={menuSettings}
          categoryNavigation={
            <Suspense
              fallback={<div className="min-h-11" aria-hidden="true" />}
            >
              <ThemeHeaderNavigation
                context={context}
                menuSettings={menuSettings}
                menuKey={menuKey}
              />
            </Suspense>
          }
          headerSettings={settings}
          transparent={transparent}
          showCountryRegionSelector={boolSetting(
            settings,
            "country_region_selector",
            true,
          )}
          showLanguageSelector={boolSetting(
            settings,
            "language_selector",
            false,
          )}
          mobileNavigation={
            <Suspense fallback={<MobileNavigationFallback />}>
              <ThemeHeaderNavigation
                context={context}
                menuSettings={menuSettings}
                menuKey={menuKey}
                mobile
              />
            </Suspense>
          }
        />
      </div>
    </>
  );
}

export function ThemeFooterSection({
  section,
  context,
}: {
  section: ThemeSectionInstance;
  context: ThemeRenderContext;
}) {
  return (
    <div data-theme-section-type="theme_footer">
      <Footer
        basePath={context.basePath}
        locale={context.locale as Locale}
        section={section}
        categoryLinks={
          <Suspense fallback={<FooterCategoryLinksFallback />}>
            <ThemeFooterCategoryLinks context={context} />
          </Suspense>
        }
      />
    </div>
  );
}
