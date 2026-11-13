import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { ShopOffersFeed } from "@/components/shop-offers/ShopOffersFeed";
import { getProductsByIds } from "@/lib/data/products";
import { getShopOffers, markShopOffersSeen } from "@/lib/data/shop-offers";

interface DealsPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default async function DealsPage({ params }: DealsPageProps) {
  await connection();
  const { country, locale } = await params;
  const basePath = `/${country}/${locale}`;
  const t = await getTranslations("offers");
  const response = await getShopOffers({ limit: 50 });
  const productIds = response.data
    .map((offer) => offer.product_id)
    .filter((id): id is string => Boolean(id));
  const products = productIds.length ? await getProductsByIds(productIds) : [];
  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );

  const unseenIds = response.data
    .filter((offer) => !offer.seen)
    .map((offer) => offer.id);
  if (unseenIds.length) {
    await markShopOffersSeen(unseenIds);
  }

  return (
    <div className="space-y-5 overflow-hidden">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-marketplace-foreground">
          {t("deals")}
        </h1>
        <p className="text-sm text-marketplace-muted-foreground">
          {t("shopOffersPageDescription")}
        </p>
      </div>

      {response.data.length ? (
        <div className="overflow-hidden rounded-lg border border-marketplace-border-subtle bg-white">
          <ShopOffersFeed
            offers={response.data}
            productsById={productsById}
            basePath={basePath}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-marketplace-border-subtle px-5 py-10 text-center">
          <p className="text-sm font-medium text-marketplace-foreground">
            {t("shopOffersEmptyTitle")}
          </p>
          <p className="mt-1 text-sm text-marketplace-muted-foreground">
            {t("shopOffersEmptyDescription")}
          </p>
        </div>
      )}
    </div>
  );
}
