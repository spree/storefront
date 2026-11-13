import type { Category } from "@spree/sdk";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { Footer, FooterCategoryLinks } from "@/components/layout/Footer";
import { Header, HeaderMobileMenu } from "@/components/layout/Header";
import { MarketplaceCategoryRow } from "@/components/layout/MarketplaceCategoryRow";
import { StorefrontFooterGate } from "@/components/layout/StorefrontFooterGate";
import {
  buildChromeContext,
  StorefrontThemeFooter,
  StorefrontThemeHeader,
  themeChromeActive,
} from "@/components/theme/StorefrontThemeChrome";
import { REQUEST_PATHNAME_HEADER, REQUEST_SEARCH_HEADER } from "@/i18n/routing";
import { getCategoryNavigationTree } from "@/lib/data/categories";
import { getPublishedNavigation } from "@/lib/data/cms-navigation";
import { getPersonalizationInterestSummary } from "@/lib/data/storefront-personalization";
import { themeSectionGroupsEnabled } from "@/lib/theme/flags";
import { getActiveTheme } from "@/lib/theme/resolver";

interface StorefrontLayoutProps {
  children: React.ReactNode;
  params: Promise<{ country: string; locale: string }>;
}

interface StorefrontNavigationProps {
  basePath: string;
  country: string;
  locale: string;
}

const EMPTY_CATEGORIES: Category[] = [];

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

/**
 * Navigation categories are optional chrome, so defer their first load until
 * there is a real request instead of making every prerendered page contact the
 * Store API. Primitive arguments let React deduplicate category navigation
 * consumers within the request; successful responses keep using the persistent
 * cache in getCategories.
 */
const getRootCategories = cache(async (country: string, locale: string) => {
  await connection();

  return getCategoryNavigationTree({ country, locale }).catch((error) => {
    console.error("StorefrontLayout: failed to load categories", error);
    return EMPTY_CATEGORIES;
  });
});

async function StorefrontMobileNavigation({
  basePath,
  country,
  locale,
}: StorefrontNavigationProps) {
  const [rootCategories, menu] = await Promise.all([
    getRootCategories(country, locale),
    getPublishedNavigation("header"),
  ]);
  const interests = menu?.settings?.show_for_you
    ? await getPersonalizationInterestSummary()
    : null;

  return (
    <HeaderMobileMenu
      rootCategories={rootCategories}
      basePath={basePath}
      cmsNavigation={menu}
      forYouCategoryIds={interests?.top_category_ids || []}
    />
  );
}

async function StorefrontCategoryNavigation({
  basePath,
  country,
  locale,
}: StorefrontNavigationProps) {
  const [categories, menu] = await Promise.all([
    getRootCategories(country, locale),
    getPublishedNavigation("header"),
  ]);
  const interests = menu?.settings?.show_for_you
    ? await getPersonalizationInterestSummary()
    : null;
  return (
    <MarketplaceCategoryRow
      basePath={basePath}
      categories={categories}
      menuItems={menu?.items}
      menuSettings={menu?.settings}
      forYouCategoryIds={interests?.top_category_ids || []}
      menuKey="header"
    />
  );
}

async function StorefrontFooterCategoryLinks({
  basePath,
  country,
  locale,
}: StorefrontNavigationProps) {
  const rootCategories = await getRootCategories(country, locale);

  return (
    <FooterCategoryLinks rootCategories={rootCategories} basePath={basePath} />
  );
}

/**
 * Pathname / shop-editor checks read request headers. Keep that runtime data
 * behind one Suspense boundary so Cache Components can still ship a static
 * shell for storefront navigations.
 */
export default function StorefrontLayout(props: StorefrontLayoutProps) {
  return (
    <Suspense fallback={null}>
      <StorefrontLayoutContent {...props} />
    </Suspense>
  );
}

export async function StorefrontLayoutContent({
  children,
  params,
}: StorefrontLayoutProps) {
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(REQUEST_PATHNAME_HEADER);
  const search = requestHeaders.get(REQUEST_SEARCH_HEADER) ?? "";
  const isShopEditorPreview =
    new URLSearchParams(search).get("shop_editor") === "1";
  if (pathname?.startsWith(`${basePath}/theme/preview/`) || isShopEditorPreview)
    return <>{children}</>;
  const theme = themeSectionGroupsEnabled()
    ? await getActiveTheme().catch(() => null)
    : null;
  const chrome = themeChromeActive(theme);
  const chromeContext = buildChromeContext({ basePath, country, locale });
  const useThemeHeader = Boolean(theme && chrome.header);
  const useThemeFooter = Boolean(theme && chrome.footer);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      {useThemeHeader && theme ? (
        <StorefrontThemeHeader theme={theme} context={chromeContext} />
      ) : (
        <Header
          basePath={basePath}
          locale={locale as Locale}
          mobileProductLayout={Boolean(
            pathname?.startsWith(`${basePath}/products/`),
          )}
          hideCategoryRow
          mobileNavigation={
            <Suspense fallback={<MobileNavigationFallback />}>
              <StorefrontMobileNavigation
                basePath={basePath}
                country={country}
                locale={locale}
              />
            </Suspense>
          }
        />
      )}
      {!useThemeHeader && (
        <Suspense fallback={null}>
          <div className="hidden border-b border-[#e1e3df] bg-white py-2 md:block">
            <StorefrontCategoryNavigation
              basePath={basePath}
              country={country}
              locale={locale}
            />
          </div>
        </Suspense>
      )}
      <main className="flex-1 bg-marketplace-background">{children}</main>
      <StorefrontFooterGate>
        {useThemeFooter && theme ? (
          <StorefrontThemeFooter theme={theme} context={chromeContext} />
        ) : (
          <Footer
            basePath={basePath}
            locale={locale as Locale}
            categoryLinks={
              <Suspense fallback={<FooterCategoryLinksFallback />}>
                <StorefrontFooterCategoryLinks
                  basePath={basePath}
                  country={country}
                  locale={locale}
                />
              </Suspense>
            }
          />
        )}
      </StorefrontFooterGate>
    </div>
  );
}
