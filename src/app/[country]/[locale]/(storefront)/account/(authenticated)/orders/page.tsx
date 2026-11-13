import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { OrderList } from "@/components/account/OrderList";
import { Button } from "@/components/ui/button";
import { getOrders } from "@/lib/data/orders";

function readPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

interface OrdersPageProps {
  params: Promise<{ country: string; locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrdersPage({
  params,
  searchParams,
}: OrdersPageProps) {
  await connection();
  const { country, locale } = await params;
  const resolvedSearchParams = await searchParams;
  const requestedPage = readPage(resolvedSearchParams.page);
  // Match Store API default page size so the first UI page covers the same rows as a bare list() call in E2E.
  const limit = 25;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "orders",
  });
  const basePath = `/${country}/${locale}`;

  let response = await getOrders({
    page: requestedPage,
    limit,
    sort: "completed_at desc",
  });
  let page = requestedPage;
  if (response.meta.pages > 0 && requestedPage > response.meta.pages) {
    page = response.meta.pages;
    response = await getOrders({
      page,
      limit,
      sort: "completed_at desc",
    });
  }
  const orders = response.data.filter((order) => order.completed_at !== null);

  return (
    <div>
      <AccountPageHeader title={t("orderHistory")} />

      {orders.length === 0 ? (
        <AccountEmptyState
          illustration="order-history-empty"
          title={t("noOrders")}
          description={t("noOrdersDescription")}
          action={
            <Button asChild>
              <Link href={`${basePath}/products`}>{t("startShopping")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <OrderList orders={orders} basePath={basePath} locale={locale} />
          {response.meta.pages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-center gap-4 border-t border-marketplace-border-subtle pt-5"
              aria-label={t("paginationLabel")}
            >
              {page > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}/account/orders?page=${page - 1}`}>
                    {t("previousPage")}
                  </Link>
                </Button>
              ) : null}
              <span className="text-sm tabular-nums text-marketplace-muted-foreground">
                {t("pageIndicator", { page, pages: response.meta.pages })}
              </span>
              {page < response.meta.pages ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${basePath}/account/orders?page=${page + 1}`}>
                    {t("nextPage")}
                  </Link>
                </Button>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
