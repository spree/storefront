import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SellerCard } from "@/components/sellers/SellerCard";
import { getSellers } from "@/lib/data/sellers";
import { buildHreflangLanguages } from "@/lib/metadata/alternates";
import { buildCanonicalUrl } from "@/lib/seo";
import { isMarketplaceEnabled } from "@/lib/spree";
import { getStoreUrl } from "@/lib/store";

const PAGE_SIZE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

interface SellersPageProps {
  params: Promise<{ country: string; locale: string }>;
  searchParams: Promise<SearchParams>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(searchParams: SearchParams): number {
  const page = Number.parseInt(firstParam(searchParams.page) ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Directory path for a page; page 1 has no query string. */
function directoryPath(page: number): string {
  return page > 1 ? `/sellers?page=${page}` : "/sellers";
}

export async function generateMetadata({
  params,
  searchParams,
}: SellersPageProps): Promise<Metadata> {
  const [{ country, locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "sellers",
  });
  const title = t("title");
  const description = t("directoryMetaDescription");
  // Each page of the directory is its own canonical URL, so sellers listed
  // only past page 1 stay reachable for crawlers.
  const path = directoryPath(parsePage(rawSearchParams));
  const storeUrl = getStoreUrl();
  const canonicalUrl = storeUrl
    ? buildCanonicalUrl(storeUrl, `/${country}/${locale}${path}`)
    : undefined;
  const languages = storeUrl
    ? await buildHreflangLanguages({ storeUrl, country, locale, path })
    : undefined;

  return {
    title,
    description,
    ...(canonicalUrl
      ? {
          alternates: {
            canonical: canonicalUrl,
            ...(languages ? { languages } : {}),
          },
        }
      : {}),
    openGraph: {
      title,
      description,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      type: "website",
    },
  };
}

export default async function SellersPage({
  params,
  searchParams,
}: SellersPageProps): Promise<React.JSX.Element> {
  // The layout gates this too, but layout and page render in parallel.
  if (!isMarketplaceEnabled()) notFound();
  const [{ country, locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const basePath = `/${country}/${locale}`;
  const page = parsePage(rawSearchParams);

  const [t, response] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "sellers" }),
    getSellers({ page, limit: PAGE_SIZE, sort: "name" }, { country, locale }),
  ]);

  const sellers = response.data;
  const { count, pages } = response.meta;
  const pageHref = (target: number): string =>
    `${basePath}${directoryPath(target)}`;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-gray-500">{t("subtitle")}</p>
      </div>

      {sellers.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {t("sellerCount", { count })}
          </p>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sellers.map((seller) => (
              <li key={seller.id} className="flex">
                <SellerCard
                  seller={seller}
                  basePath={basePath}
                  logoAlt={t("logoAlt", { name: seller.name })}
                  visitShopLabel={t("visitShop")}
                />
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav
              aria-label={t("pagination")}
              className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6 text-sm"
            >
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="font-medium text-gray-900 hover:underline"
                >
                  &larr; {t("previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-gray-500">
                {t("pageOf", { page, pages })}
              </span>
              {page < pages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {t("next")} &rarr;
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      ) : count > 0 ? (
        // Sellers exist, but the requested page is past the last one.
        <div className="py-16 text-center">
          <h2 className="text-lg font-medium text-gray-900">
            {t("pageOutOfRange", { page })}
          </h2>
          <Link
            href={pageHref(1)}
            className="mt-2 inline-block text-sm font-medium text-gray-900 hover:underline"
          >
            {t("backToFirstPage")}
          </Link>
        </div>
      ) : (
        <div className="py-16 text-center">
          <h2 className="text-lg font-medium text-gray-900">
            {t("noSellers")}
          </h2>
          <p className="mt-2 text-gray-500">{t("noSellersHint")}</p>
        </div>
      )}
    </div>
  );
}
