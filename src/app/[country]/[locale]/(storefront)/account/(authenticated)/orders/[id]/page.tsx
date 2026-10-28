import { isOrderGroup } from "@spree/sdk";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { OrderDetail } from "@/components/account/OrderDetail";
import { getOrder } from "@/lib/data/orders";

interface OrderDetailPageProps {
  params: Promise<{
    country: string;
    locale: string;
    id: string;
  }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  await connection();
  const { country, locale, id } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "orders",
  });
  const basePath = `/${country}/${locale}`;
  const order = await getOrder(id);

  // Account pages link to single orders by their id; an order group only
  // comes back for a cart id, which is not an order of this account.
  if (!order || isOrderGroup(order) || order.completed_at === null) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900 mb-2">
          {t("orderNotFound")}
        </h2>
        <p className="text-gray-500 mb-6">{t("orderNotFoundDescription")}</p>
        <Link
          href={`${basePath}/account/orders`}
          className="text-primary hover:text-primary font-medium"
        >
          {t("backToOrders")}
        </Link>
      </div>
    );
  }

  return <OrderDetail order={order} basePath={basePath} locale={locale} />;
}
