import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { OrderList } from "@/components/account/OrderList";
import { getCompany, getCompanyOrders } from "@/lib/data/companies";

interface CompanyOrdersPageProps {
  params: Promise<{ country: string; locale: string; id: string }>;
}

/**
 * What the organization has bought — every completed order across the node's
 * subtree, not only the ones placed by the buyer looking at the page. That is
 * the point of a company view: a purchasing team sees the department's spend,
 * not just their own.
 */
export default async function CompanyOrdersPage({
  params,
}: CompanyOrdersPageProps) {
  await connection();
  const { country, locale, id } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "companies",
  });

  const [company, orders] = await Promise.all([
    getCompany(id),
    getCompanyOrders(id),
  ]);

  if (!company) notFound();

  const basePath = `/${country}/${locale}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">{t("ordersTitle")}</h1>
        <p className="text-muted-foreground text-sm">{company.name}</p>
      </div>

      <OrderList orders={orders.data} basePath={basePath} locale={locale} />
    </div>
  );
}
