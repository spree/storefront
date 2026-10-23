import type { Order } from "@spree/sdk";
import { formatMoney } from "@spree/sdk";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  getFulfillmentStatusColor,
  getPaymentStatusColor,
  getStatusLabel,
} from "@/lib/utils/format";

interface OrderListProps {
  orders: Order[];
  basePath: string;
  locale: string;
}

export async function OrderList({ orders, basePath, locale }: OrderListProps) {
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "orders",
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("order")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("date")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("payment")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("shipment")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("totalColumn")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    <Button variant="link" size="sm" asChild className="p-0">
                      <Link href={`${basePath}/account/orders/${order.id}`}>
                        #{order.number}
                      </Link>
                    </Button>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {formatDate(order.completed_at, "-", locale)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium capitalize ${getPaymentStatusColor(order.payment_status)}`}
                  >
                    {getStatusLabel(order.payment_status ?? null, t)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium capitalize ${getFulfillmentStatusColor(order.fulfillment_status)}`}
                  >
                    {getStatusLabel(order.fulfillment_status ?? null, t)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatMoney(order.total, order.currency, locale)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Button variant="link" size="sm" asChild>
                    <Link href={`${basePath}/account/orders/${order.id}`}>
                      {t("view")}
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
