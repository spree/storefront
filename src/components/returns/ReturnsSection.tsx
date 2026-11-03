import type { Exchange, Order, Return } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getPostSaleRequests, type OrderAccess } from "@/lib/data/returns";
import { formatDate } from "@/lib/utils/format";
import { canRequestReturn } from "@/lib/utils/returns";
import { WithdrawRequestButton } from "./WithdrawRequestButton";

interface ReturnsSectionProps {
  /** The seller orders behind the purchase — returns are opened per order. */
  orders: Order[];
  basePath: string;
  locale: string;
  /** Where an order's request form lives; differs for account and guest. */
  requestHref: (order: Order) => string;
  access?: OrderAccess;
}

/**
 * Returns and exchanges on the order page: the way in, the deadlines that
 * apply, and every request already sent with what can still be done with it.
 */
export async function ReturnsSection({
  orders,
  basePath,
  locale,
  requestHref,
  access,
}: ReturnsSectionProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "returns",
  });
  const requests = await Promise.all(
    orders.map((order) => getPostSaleRequests(order.id, access)),
  );

  return (
    <section
      aria-labelledby="returns-heading"
      className="bg-white rounded-xl border border-gray-200 p-6 mb-4"
    >
      <h2
        id="returns-heading"
        className="text-base font-semibold text-gray-900 mb-4"
      >
        {t("sectionTitle")}
      </h2>

      {orders.map((order, index) => {
        const { returns, exchanges } = requests[index];
        const eligibility = order.returns_eligibility;

        return (
          <div key={order.id} className="space-y-4 [&+&]:mt-6">
            {orders.length > 1 && (
              <p className="text-sm font-medium text-gray-900">
                {t("orderLabel", { number: order.number })}
              </p>
            )}

            <Deadlines order={order} locale={locale} t={t} />

            {canRequestReturn(order) ? (
              <Button asChild>
                <Link href={requestHref(order)}>{t("start")}</Link>
              </Button>
            ) : (
              eligibility?.errors?.[0] && (
                <p className="text-sm text-gray-500">
                  {eligibility.errors[0].message}
                </p>
              )
            )}

            {(returns.length > 0 || exchanges.length > 0) && (
              <ul className="divide-y divide-gray-200 border-t border-gray-200">
                {returns.map((record) => (
                  <RequestRow
                    key={record.id}
                    kind="return"
                    record={record}
                    order={order}
                    access={access}
                    t={t}
                  />
                ))}
                {exchanges.map((record) => (
                  <RequestRow
                    key={record.id}
                    kind="exchange"
                    record={record}
                    order={order}
                    access={access}
                    t={t}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <p className="text-sm mt-4">
        <Link
          href={`${basePath}/policies/return-policy`}
          className="text-primary hover:underline"
        >
          {t("policyLink")}
        </Link>
      </p>
    </section>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations<"returns">>>;

function Deadlines({
  order,
  locale,
  t,
}: {
  order: Order;
  locale: string;
  t: Translate;
}) {
  const windowEndsAt = order.returns_eligibility?.return_window_ends_at;
  const withdrawalEndsAt = order.withdrawal_period_ends_at;

  return (
    <div className="text-sm text-gray-600 space-y-1">
      {withdrawalEndsAt ? (
        <p>
          {t("withdrawalDeadline", {
            date: formatDate(withdrawalEndsAt, "-", locale),
          })}
        </p>
      ) : (
        order.within_withdrawal_period && <p>{t("withdrawalPending")}</p>
      )}
      {windowEndsAt && windowEndsAt !== withdrawalEndsAt && (
        <p>
          {t("returnWindow", { date: formatDate(windowEndsAt, "-", locale) })}
        </p>
      )}
    </div>
  );
}

function RequestRow({
  kind,
  record,
  order,
  access,
  t,
}: {
  kind: "return" | "exchange";
  record: Return | Exchange;
  order: Order;
  access?: OrderAccess;
  t: Translate;
}) {
  const returnRecord = kind === "return" ? (record as Return) : null;
  const labelHref = returnRecord?.label_available
    ? `/api/returns/label?${new URLSearchParams({
        order: order.id,
        return: record.id,
        ...(access?.orderToken ? { token: access.orderToken } : {}),
      })}`
    : null;

  return (
    <li className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {t(kind === "return" ? "returnNumber" : "exchangeNumber", {
            number: record.number,
          })}
        </p>
        <p className="text-sm text-gray-500">
          {t(`status.${record.status}`)}
          {returnRecord?.display_refund_total &&
            ` · ${t("refundTotal", { amount: returnRecord.display_refund_total })}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {labelHref && (
          <Button asChild variant="outline" size="sm">
            <a href={labelHref}>{t("downloadLabel")}</a>
          </Button>
        )}
        {returnRecord?.tracking_url && (
          <Button asChild variant="outline" size="sm">
            <a
              href={returnRecord.tracking_url}
              target="_blank"
              rel="noreferrer"
            >
              {t("track")}
            </a>
          </Button>
        )}
        {record.cancelable && (
          <WithdrawRequestButton
            orderId={order.id}
            kind={kind}
            id={record.id}
            access={access}
          />
        )}
      </div>
    </li>
  );
}
