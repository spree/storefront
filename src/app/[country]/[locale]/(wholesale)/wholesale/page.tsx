import { getTranslations } from "next-intl/server";
import { ProductListing } from "@/components/products/ProductListing";
import { resolveCurrency } from "@/lib/data/markets";
import {
  getWholesaleProductFilters,
  getWholesaleProducts,
} from "@/lib/data/wholesale";
import { parseListingSearchParams } from "@/lib/utils/listing-search-params";
import { WHOLESALE_MIN_QUANTITY } from "@/lib/wholesale";
import { WholesaleGate } from "./_components/WholesaleGate";

interface WholesalePlpProps {
  params: Promise<{ country: string; locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WholesaleProductsPage({
  params,
  searchParams,
}: WholesalePlpProps) {
  const { country, locale } = await params;
  const rawSearchParams = await searchParams;
  const basePath = `/${country}/${locale}/wholesale`;
  const currency = await resolveCurrency(country);

  const listingState = parseListingSearchParams(rawSearchParams);
  const query = listingState.query;

  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "wholesale",
  });

  return (
    <WholesaleGate basePath={`/${country}/${locale}`} allowGuestBrowse>
      {() => (
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              {t("plp.title")}
            </h1>
            <p className="mt-2 text-slate-500">{t("plp.subtitle")}</p>
            <p className="mt-4 inline-block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {t("plp.tradePriceNote", { min: WHOLESALE_MIN_QUANTITY })}
            </p>
          </div>

          <ProductListing
            state={listingState}
            basePath={basePath}
            currency={currency}
            locale={locale as Locale}
            listId="wholesale-catalog"
            listName="Wholesale Catalog"
            fetchProducts={getWholesaleProducts}
            fetchFilters={getWholesaleProductFilters}
            emptyMessage={
              query ? t("plp.noMatchingProducts", { query }) : t("plp.empty")
            }
          />
        </div>
      )}
    </WholesaleGate>
  );
}
