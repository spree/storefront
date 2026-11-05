import { LazyProductCarousel } from "@/components/products/LazyProductCarousel";
import { PRODUCT_CARD_FIELDS } from "@/lib/data/cached";
import { cachedListProducts } from "@/lib/data/products";
import { getAccessToken } from "@/lib/spree";

interface FeaturedProductsProps {
  basePath: string;
  locale: string;
  country: string;
  currency?: string;
}

export async function FeaturedProducts({
  basePath,
  locale,
  country,
  currency,
}: FeaturedProductsProps) {
  const userToken = await getAccessToken();
  const productsResponse = await cachedListProducts(
    { limit: 8, fields: PRODUCT_CARD_FIELDS },
    { locale, country },
    "dtc",
    userToken,
  );

  return (
    <LazyProductCarousel
      products={productsResponse.data ?? []}
      basePath={basePath}
      currency={currency}
    />
  );
}
