import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FavoritesDiscoveryRail } from "@/components/account/FavoritesDiscoveryRail";
import { SponsoredDiscoveryRailSection } from "@/components/ads/SponsoredDiscoveryRailSection";
import { EmptyStateIllustration } from "@/components/empty-states/EmptyStateIllustration";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { listFavorites } from "@/lib/data/favorites";

export async function WishlistPageContent({
  country,
  locale,
}: {
  country: string;
  locale: string;
}) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account",
  });
  const basePath = `/${country}/${locale}`;
  const result = await listFavorites();
  const items = result.success ? result.data : [];

  return (
    <div>
      <h1 className="marketplace-listing-title mb-6 text-marketplace-foreground">
        {t("favorites")}
      </h1>
      {!items.length ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <EmptyStateIllustration
            name="no-favorites-yet"
            className="mx-auto mb-4 text-gray-600"
          />
          <p className="font-medium text-gray-900">{t("favoritesEmpty")}</p>
          <p className="mt-2 text-sm text-gray-500">
            {t("favoritesEmptyHelp")}
          </p>
          <Button className="mt-6" asChild>
            <Link href={`${basePath}/products`}>{t("browseMarketplace")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) =>
            item.product ? (
              <ProductCard
                key={item.id}
                product={item.product}
                basePath={basePath}
                favorited
                merchandisingSurface="favorites"
              />
            ) : null,
          )}
        </div>
      )}
      <FavoritesDiscoveryRail basePath={basePath} locale={locale} />
      <SponsoredDiscoveryRailSection
        placement="favorites_discovery"
        titleKey="sponsoredDiscovery"
        titleNamespace="account"
        basePath={basePath}
        locale={locale}
        limit={8}
        organicProductIds={items
          .map((item) => item.product?.id)
          .filter((id): id is string => Boolean(id))}
        className="mt-10"
      />
    </div>
  );
}
