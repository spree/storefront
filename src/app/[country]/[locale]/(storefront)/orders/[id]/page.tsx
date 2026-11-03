import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { OrderDetail } from "@/components/account/OrderDetail";
import { getGuestPurchase } from "@/lib/data/returns";

interface GuestOrderPageProps {
  params: Promise<{ country: string; locale: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * An order opened from an emailed link, without signing in: the token in the
 * link is what lets the API answer.
 */
export default async function GuestOrderPage({
  params,
  searchParams,
}: GuestOrderPageProps) {
  await connection();
  const { country, locale, id } = await params;
  const { token } = await searchParams;
  const basePath = `/${country}/${locale}`;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "orders",
  });
  const tf = await getTranslations({
    locale: locale as Locale,
    namespace: "returns.find",
  });
  const order = token ? await getGuestPurchase(id, token) : null;

  if (!order || order.completed_at === null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <h1 className="text-xl font-medium text-gray-900">
          {t("orderNotFound")}
        </h1>
        <p className="text-gray-500">{tf("linkExpired")}</p>
        <Link
          href={`${basePath}/orders/find`}
          className="text-primary font-medium"
        >
          {tf("title")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <OrderDetail
        order={order}
        basePath={basePath}
        locale={locale}
        access={{ orderToken: token }}
      />
    </div>
  );
}
