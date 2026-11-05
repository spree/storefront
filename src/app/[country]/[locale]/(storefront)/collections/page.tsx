import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { getCollections } from "@/lib/data/collections";
import { buildHreflangLanguages } from "@/lib/metadata/alternates";
import { buildCanonicalUrl } from "@/lib/seo";
import { getStoreUrl } from "@/lib/store";

const PAGE_SIZE = 24;

type SearchParams = Record<string, string | string[] | undefined>;

interface CollectionsPageProps {
  params: Promise<{ country: string; locale: string }>;
  searchParams: Promise<SearchParams>;
}

function parsePage(searchParams: SearchParams): number {
  const raw = searchParams.page;
  const page = Number.parseInt((Array.isArray(raw) ? raw[0] : raw) ?? "", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

/** Index path for a page; page 1 has no query string. */
function indexPath(page: number): string {
  return page > 1 ? `/collections?page=${page}` : "/collections";
}

export async function generateMetadata({
  params,
  searchParams,
}: CollectionsPageProps): Promise<Metadata> {
  const [{ country, locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "collections",
  });
  const title = t("title");
  const description = t("directoryMetaDescription");
  // Each page is its own canonical URL, so collections listed only past
  // page 1 stay reachable for crawlers.
  const path = indexPath(parsePage(rawSearchParams));
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

export default async function CollectionsPage({
  params,
  searchParams,
}: CollectionsPageProps): Promise<React.JSX.Element> {
  const [{ country, locale }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const basePath = `/${country}/${locale}`;
  const page = parsePage(rawSearchParams);

  // `position` is the order the merchant arranged collections in.
  const [t, response] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "collections" }),
    getCollections(
      { page, limit: PAGE_SIZE, sort: "position" },
      { country, locale },
    ),
  ]);

  const collections = response.data;
  const { count, pages } = response.meta;
  const pageHref = (target: number): string =>
    `${basePath}${indexPath(target)}`;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-gray-500">{t("subtitle")}</p>
      </div>

      {collections.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-gray-500">
            {t("collectionCount", { count })}
          </p>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <li key={collection.id} className="flex">
                <CollectionCard
                  collection={collection}
                  basePath={basePath}
                  productCountLabel={t("productCount", {
                    count: collection.products_count,
                  })}
                  viewLabel={t("viewCollection")}
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
        // Collections exist, but the requested page is past the last one.
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
            {t("noCollections")}
          </h2>
          <p className="mt-2 text-gray-500">{t("noCollectionsHint")}</p>
        </div>
      )}
    </div>
  );
}
