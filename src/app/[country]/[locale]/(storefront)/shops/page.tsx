import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  MarketplaceEmptyState,
  MarketplaceGrid,
  MarketplacePage,
  MarketplaceSection,
  MarketplaceSectionHeader,
  MarketplaceToolbar,
} from "@/components/marketplace";
import { ShopCard } from "@/components/shops/ShopCard";
import { ShopDirectorySort } from "@/components/shops/ShopDirectorySort";
import { Button } from "@/components/ui/button";
import { listSellers } from "@/lib/data/sellers";
import { generateShopsMetadata } from "@/lib/metadata/shops";
import { parseShopDirectorySort } from "@/lib/shops/sort-options";

interface ShopsPageProps {
  params: Promise<{ country: string; locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: ShopsPageProps): Promise<Metadata> {
  const { country, locale } = await params;
  return generateShopsMetadata({ country, locale });
}

function readPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ShopsPage({
  params,
  searchParams,
}: ShopsPageProps) {
  const { country, locale } = await params;
  const resolved = await searchParams;
  const basePath = `/${country}/${locale}`;
  const page = readPage(resolved.page);
  const sort = parseShopDirectorySort(
    Array.isArray(resolved.sort) ? resolved.sort[0] : resolved.sort,
  );
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "shops",
  });

  const response = await listSellers({ page, limit: 24, sort }).catch(
    () => null,
  );
  const sellers = response?.data ?? [];
  const meta = response?.meta;
  const total = meta?.count ?? sellers.length;

  return (
    <MarketplaceSection className="py-10 lg:py-14">
      <MarketplacePage>
        <MarketplaceSectionHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
          headingLevel="h1"
        />

        <MarketplaceToolbar className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-marketplace-muted-foreground">
            {t("resultCount", { count: total })}
          </p>
          <ShopDirectorySort currentSort={sort} />
        </MarketplaceToolbar>

        {sellers.length === 0 ? (
          <MarketplaceEmptyState
            illustration="no-listings-yet"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Button asChild>
                <Link href={`${basePath}/products`}>{t("browseProducts")}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <MarketplaceGrid className="grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sellers.map((seller) => (
                <ShopCard
                  key={seller.id}
                  seller={seller}
                  basePath={basePath}
                  locale={locale}
                  variant="rich"
                />
              ))}
            </MarketplaceGrid>

            {meta && meta.pages > 1 ? (
              <nav
                className="mt-10 flex items-center justify-center gap-4"
                aria-label={t("paginationLabel")}
              >
                {page > 1 ? (
                  <Button variant="outline" asChild>
                    <Link
                      href={`${basePath}/shops?sort=${sort}&page=${page - 1}`}
                    >
                      {t("previousPage")}
                    </Link>
                  </Button>
                ) : null}
                <span className="text-sm text-marketplace-muted-foreground">
                  {t("pageIndicator", { page, pages: meta.pages })}
                </span>
                {page < meta.pages ? (
                  <Button variant="outline" asChild>
                    <Link
                      href={`${basePath}/shops?sort=${sort}&page=${page + 1}`}
                    >
                      {t("nextPage")}
                    </Link>
                  </Button>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </MarketplacePage>
    </MarketplaceSection>
  );
}
