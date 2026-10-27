import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductDetails } from "@/app/[country]/[locale]/(storefront)/products/[slug]/ProductDetails";
import { PRODUCT_PAGE_EXPAND } from "@/lib/data/cached";
import { getWholesaleProduct } from "@/lib/data/wholesale";
import { WHOLESALE_MIN_QUANTITY } from "@/lib/wholesale";
import { WholesaleGate } from "../../_components/WholesaleGate";

interface WholesaleProductPageProps {
  params: Promise<{ country: string; locale: string; slug: string }>;
}

/**
 * Wholesale PDP. The gate runs first (so guests see the sign-in wall rather
 * than a 404 from the gated channel); the product fetch happens inside the
 * gate, for an approved buyer. Reuses the storefront <ProductDetails> — its
 * add-to-cart runs through useCart(), which resolves to the wholesale-bound
 * provider inside this route group. Wholesale prices are resolved by the API
 * via the price list on the gated channel.
 */
export default async function WholesaleProductPage({
  params,
}: WholesaleProductPageProps) {
  const { country, locale, slug } = await params;

  return (
    <WholesaleGate basePath={`/${country}/${locale}`} allowGuestBrowse>
      {() => (
        <WholesaleProductContent
          country={country}
          locale={locale}
          slug={slug}
        />
      )}
    </WholesaleGate>
  );
}

async function WholesaleProductContent({
  country,
  locale,
  slug,
}: {
  country: string;
  locale: string;
  slug: string;
}) {
  const basePath = `/${country}/${locale}/wholesale`;

  let product;
  try {
    product = await getWholesaleProduct(slug, { expand: PRODUCT_PAGE_EXPAND });
  } catch {
    notFound();
  }

  if (!product) notFound();

  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "wholesale",
  });

  return (
    <>
      <div className="container mx-auto px-4 pt-8 sm:px-6 lg:px-8">
        <p className="inline-block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
          {t("pdp.tradePriceHint", { min: WHOLESALE_MIN_QUANTITY })}
        </p>
      </div>
      <ProductDetails product={product} basePath={basePath} />
    </>
  );
}
