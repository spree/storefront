import type { Seller } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { ShopCard } from "@/components/shops/ShopCard";
import { Button } from "@/components/ui/button";
import { listFollowedShops } from "@/lib/data/follows";

interface FollowedShopsPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default async function FollowedShopsPage({
  params,
}: FollowedShopsPageProps) {
  const { country, locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account",
  });
  const basePath = `/${country}/${locale}`;
  const result = await listFollowedShops();
  const rows =
    result.success && "data" in result && Array.isArray(result.data)
      ? result.data
      : [];
  const sellers = rows
    .map((row) => (row as { seller?: Seller }).seller)
    .filter(Boolean) as Seller[];

  return (
    <div>
      <AccountPageHeader title={t("followedShops")} />
      {!sellers.length ? (
        <AccountEmptyState
          illustration="no-followed-shops"
          title={t("followedShopsEmpty")}
          action={
            <Button asChild>
              <Link href={`${basePath}/shops`}>{t("browseShops")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((seller) => (
            <ShopCard
              key={seller.id}
              seller={seller}
              basePath={basePath}
              locale={locale}
              variant="rich"
            />
          ))}
        </div>
      )}
    </div>
  );
}
