import type { Order } from "@spree/sdk";
import { formatMoney } from "@spree/sdk";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AddressBlock } from "@/components/order/AddressBlock";
import { FulfillmentBlock } from "@/components/order/FulfillmentBlock";
import { LineItemCard } from "@/components/order/LineItemCard";
import { OrderTotals } from "@/components/order/OrderTotals";
import { PaymentInfo } from "@/components/order/PaymentInfo";
import { formatDateTime } from "@/lib/utils/format";

interface OrderDetailProps {
  order: Order;
  basePath: string;
  locale: string;
}

export async function OrderDetail({
  order,
  basePath,
  locale,
}: OrderDetailProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "orders",
  });
  const hasFulfillments = order.fulfillments && order.fulfillments.length > 0;

  return (
    <div>
      <Link
        href={`${basePath}/account/orders`}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        {t("backToOrders")}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">
        {t("orderTitle", { number: order.number })}
      </h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        {t("placedOn", { date: formatDateTime(order.completed_at, locale) })}
      </p>

      {hasFulfillments ? (
        order.fulfillments.map((fulfillment) => {
          const manifestItemIds = new Set(
            fulfillment.items?.map((i) => i.item_id) ?? [],
          );
          const fulfillmentLineItems =
            manifestItemIds.size > 0
              ? (order.items || []).filter((item) =>
                  manifestItemIds.has(item.id),
                )
              : order.items || [];

          return (
            <FulfillmentBlock
              key={fulfillment.id}
              fulfillment={fulfillment}
              shipAddress={order.shipping_address}
              basePath={basePath}
              lineItems={fulfillmentLineItems}
            />
          );
        })
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="divide-y divide-gray-200">
            {order.items?.map((item) => (
              <div key={item.id} className="px-6 py-4">
                <LineItemCard item={item} basePath={basePath} />
              </div>
            ))}
          </div>
        </div>
      )}

      {order.customer_note && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {t("specialInstructions")}
          </h3>
          <p className="text-sm text-gray-900">{order.customer_note}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {order.billing_address && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("billingAddress")}
              </h3>
              <AddressBlock address={order.billing_address} />
            </div>
          )}
          {order.payments && order.payments.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("paymentInformation")}
              </h3>
              {order.payments
                .filter((p) => p.status !== "void" && p.status !== "invalid")
                .map((payment) => (
                  <div key={payment.id} className="mb-3 last:mb-0">
                    <PaymentInfo
                      payment={payment}
                      currency={order.currency}
                      giftCardTotal={order.gift_card_total}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formatMoney(payment.amount, order.currency, locale)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <OrderTotals order={order} />
      </div>
    </div>
  );
}
