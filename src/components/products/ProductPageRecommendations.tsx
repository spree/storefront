import { getTranslations } from "next-intl/server";
import { ProductRecommendationRail } from "@/components/products/ProductRecommendationRail";
import {
  getMoreFromShopProducts,
  getSimilarProducts,
} from "@/lib/data/recommendations";

interface ProductPageRecommendationsProps {
  productId: string;
  sellerName?: string | null;
  basePath: string;
  currency?: string;
  locale: string;
  showRelated?: boolean;
  showRecommended?: boolean;
  relatedHeading?: string;
  recommendedHeading?: string;
  productCount?: number;
}

export async function ProductPageRecommendations({
  productId,
  sellerName,
  basePath,
  currency,
  locale,
  showRelated = true,
  showRecommended = true,
  relatedHeading,
  recommendedHeading,
  productCount = 8,
}: ProductPageRecommendationsProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "products",
  });

  const [shopProducts, similarProducts] = await Promise.all([
    showRelated ? getMoreFromShopProducts(productId) : Promise.resolve([]),
    showRecommended ? getSimilarProducts(productId) : Promise.resolve([]),
  ]);

  const moreFromShop = shopProducts
    .filter((p) => p.id !== productId)
    .slice(0, productCount);
  const similar = similarProducts
    .filter((p) => p.id !== productId)
    .slice(0, productCount);

  const shopTitle = sellerName
    ? t("moreFromShop", { shop: sellerName })
    : t("moreFromThisShop");

  return (
    <>
      {showRelated ? (
        <ProductRecommendationRail
          title={relatedHeading || shopTitle}
          products={moreFromShop}
          basePath={basePath}
          currency={currency}
          listId="recommendation-shop"
          listName="More from shop"
          dismissSurface="pdp:shop"
          analyticsSurface="pdp"
        />
      ) : null}
      {showRecommended ? (
        <ProductRecommendationRail
          title={recommendedHeading || t("similarProducts")}
          products={similar}
          basePath={basePath}
          currency={currency}
          listId="recommendation-similar"
          listName="You may also like"
          dismissSurface="pdp:similar"
          dismissible={false}
          analyticsSurface="pdp"
          personalized
          mobileSlidesPerView={2}
        />
      ) : null}
    </>
  );
}
