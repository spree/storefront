import type { Order, OrderProof } from "@spree/sdk";
import { ArrowUpLeft, CircleCheck, PackageCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ContactSellerButton } from "@/components/account/ContactSellerButton";
import { GetHelpButton } from "@/components/account/GetHelpButton";
import { AddressBlock } from "@/components/order/AddressBlock";
import { FulfillmentBlock } from "@/components/order/FulfillmentBlock";
import { LineItemCard } from "@/components/order/LineItemCard";
import { OrderTotals } from "@/components/order/OrderTotals";
import { PaymentInfo } from "@/components/order/PaymentInfo";
import type { LineItemReviewState } from "@/lib/reviews/line-item-review-state";
import {
  formatDateTime,
  getFulfillmentStatusColor,
  getPaymentStatusColor,
} from "@/lib/utils/format";

interface OrderDetailProps {
  order: Order;
  basePath: string;
  locale: string;
  helpAlreadyOpen?: boolean;
  lineItemReviewStates?: Record<string, LineItemReviewState>;
  proofs?: OrderProof[];
}

function readableStatus(status: string | null | undefined) {
  return status?.replace(/_/g, " ") || "-";
}

export async function OrderDetail({
  order,
  basePath,
  locale,
  helpAlreadyOpen = false,
  lineItemReviewStates = {},
  proofs = [],
}: OrderDetailProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "orders",
  });
  const hasFulfillments = Boolean(order.fulfillments?.length);
  const hasSeller = (order.items ?? []).some((item) => Boolean(item.seller_id));
  const canGetHelp =
    Boolean(order.completed_at) &&
    order.fulfillment_status !== "canceled" &&
    hasSeller;
  const visiblePayments = (order.payments ?? []).filter(
    (payment) => payment.status !== "void" && payment.status !== "invalid",
  );

  return (
    <div className="space-y-5">
      <Link
        href={`${basePath}/account/orders`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-marketplace-muted-foreground transition-colors hover:text-marketplace-foreground"
      >
        <ArrowUpLeft className="size-4" aria-hidden="true" />
        {t("backToOrders")}
      </Link>

      <header className="flex flex-col gap-4 border-b border-marketplace-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-marketplace-muted-foreground">
            {t("placedOn", {
              date: formatDateTime(order.completed_at, locale),
            })}
          </p>
          <h1 className="marketplace-listing-title text-marketplace-foreground">
            {t("orderTitle", { number: order.number })}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize ${getFulfillmentStatusColor(order.fulfillment_status)}`}
            >
              <PackageCheck className="size-3.5" aria-hidden="true" />
              {readableStatus(order.fulfillment_status)}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize ${getPaymentStatusColor(order.payment_status)}`}
            >
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {readableStatus(order.payment_status)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasSeller ? (
            <ContactSellerButton orderId={order.id} basePath={basePath} />
          ) : null}
          {canGetHelp ? (
            <GetHelpButton
              orderId={order.id}
              basePath={basePath}
              disabled={helpAlreadyOpen}
            />
          ) : null}
        </div>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section aria-label={t("orderTitle", { number: order.number })}>
            {hasFulfillments ? (
              <div className="space-y-4">
                {order.fulfillments?.map((fulfillment) => {
                  const manifestItemIds = new Set(
                    fulfillment.items?.map((item) => item.item_id) ?? [],
                  );
                  const fulfillmentLineItems =
                    manifestItemIds.size > 0
                      ? (order.items ?? []).filter((item) =>
                          manifestItemIds.has(item.id),
                        )
                      : (order.items ?? []);

                  return (
                    <FulfillmentBlock
                      key={fulfillment.id}
                      fulfillment={fulfillment}
                      shipAddress={order.shipping_address}
                      basePath={basePath}
                      lineItems={fulfillmentLineItems}
                      lineItemReviewStates={lineItemReviewStates}
                      orderId={order.id}
                      proofs={proofs}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-marketplace-border-subtle bg-marketplace-surface">
                <div className="divide-y divide-marketplace-border-subtle">
                  {order.items?.map((item) => (
                    <div key={item.id} className="p-4 sm:p-5">
                      <LineItemCard
                        item={item}
                        basePath={basePath}
                        orderId={order.id}
                        proofs={proofs}
                        reviewState={lineItemReviewStates[item.id]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {order.customer_note ? (
            <section className="rounded-lg border border-marketplace-border-subtle bg-marketplace-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-marketplace-foreground">
                {t("specialInstructions")}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-marketplace-muted-foreground">
                {order.customer_note}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className="rounded-lg border border-marketplace-border-subtle bg-marketplace-surface p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-marketplace-foreground">
              {t("orderTitle", { number: order.number })}
            </h2>
            <OrderTotals order={order} />
          </section>

          {visiblePayments.length > 0 ? (
            <section className="rounded-lg border border-marketplace-border-subtle bg-marketplace-surface p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-marketplace-foreground">
                {t("paymentInformation")}
              </h2>
              <div className="space-y-4">
                {visiblePayments.map((payment) => (
                  <div key={payment.id}>
                    <PaymentInfo payment={payment} />
                    <p className="mt-1 text-xs text-marketplace-muted-foreground">
                      {payment.display_amount}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {order.billing_address ? (
            <section className="rounded-lg border border-marketplace-border-subtle bg-marketplace-surface p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-semibold text-marketplace-foreground">
                {t("billingAddress")}
              </h2>
              <AddressBlock address={order.billing_address} />
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
