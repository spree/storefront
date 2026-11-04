import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductListing } from "@/components/products/ProductListing";
import { SellerHeader } from "@/components/sellers/SellerHeader";
import { resolveCurrency } from "@/lib/data/markets";
import { getProductFilters } from "@/lib/data/products";
import { getSeller, getSellerProducts } from "@/lib/data/sellers";
import { buildHreflangLanguages } from "@/lib/metadata/alternates";
import { buildCanonicalUrl } from "@/lib/seo";
import { isMarketplaceEnabled } from "@/lib/spree";
import { getStoreUrl } from "@/lib/store";
import { parseListingSearchParams } from "@/lib/utils/listing-search-params";

/** Same expand list for page and metadata so both share one cache entry. */
const SELLER_PAGE_EXPAND = ["policies"];

interface SellerPageProps {
  params: Promise<{ country: string; locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: SellerPageProps): Promise<Metadata> {
  if (!isMarketplaceEnabled()) return {};
  const { country, locale, slug } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "sellers",
  });

  const seller = await getSeller(
    slug,
    { expand: SELLER_PAGE_EXPAND },
    { country, locale },
  );
  if (!seller) return { title: t("sellerNotFound") };

  const title = seller.name;
  const description =
    seller.about?.slice(0, 160) || t("metaDescription", { name: seller.name });
  const image = seller.cover_photo_url || seller.logo_url;
  const path = `/sellers/${seller.slug}`;
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
      ...(image ? { images: [{ url: image, alt: seller.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function SellerPage({
  params,
  searchParams,
}: SellerPageProps): Promise<React.JSX.Element> {
  // The layout gates this too, but layout and page render in parallel.
  if (!isMarketplaceEnabled()) notFound();
  const { country, locale, slug } = await params;
  const [rawSearchParams, seller, currency, t] = await Promise.all([
    searchParams,
    getSeller(slug, { expand: SELLER_PAGE_EXPAND }, { country, locale }),
    resolveCurrency(country),
    getTranslations({ locale: locale as Locale, namespace: "sellers" }),
  ]);

  // The 404 status comes from the proxy's existence check; this is the
  // fallback for a seller that disappears between that check and the render.
  if (!seller) notFound();

  const basePath = `/${country}/${locale}`;
  const listingState = parseListingSearchParams(rawSearchParams);

  // Pre-bind the seller ID so the client InfiniteProductList island gets a
  // single-arg fetcher; `.bind()` on a server action serializes across the
  // server→client boundary where an inline closure would not.
  const fetchSellerProducts = getSellerProducts.bind(null, seller.id);

  return (
    <div className="pb-8">
      <SellerHeader
        seller={seller}
        basePath={basePath}
        locale={locale as Locale}
      />

      <section
        aria-labelledby="seller-products"
        className="container mx-auto px-4 sm:px-6 lg:px-8 mt-10"
      >
        <h2
          id="seller-products"
          className="mb-4 text-xl font-semibold text-gray-900"
        >
          {t("products")}
        </h2>
        <ProductListing
          state={listingState}
          basePath={basePath}
          currency={currency}
          locale={locale as Locale}
          listId={`seller-${seller.id}`}
          listName={`Seller: ${seller.name}`}
          baseParams={{ seller_id_eq: seller.id }}
          fetchProducts={fetchSellerProducts}
          fetchFilters={getProductFilters}
          emptyMessage={t("noProducts")}
        />
      </section>
    </div>
  );
}
