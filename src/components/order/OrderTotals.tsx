import type { Cart, Order } from "@spree/sdk";
import { useTranslations } from "next-intl";

type OrderLike = Cart | Order;

interface OrderTotalsProps {
  order: OrderLike;
}

export function OrderTotals({ order }: OrderTotalsProps) {
  const t = useTranslations("common");

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">{t("subtotal")}</span>
        <span className="text-gray-900">{order.display_item_total}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-500">{t("shipping")}</span>
        <span className="text-gray-900">{order.display_delivery_total}</span>
      </div>

      {(order.fees ?? []).map((fee) => (
        <div key={fee.id} className="flex justify-between text-sm">
          <span className="text-gray-500">{fee.label}</span>
          <span className="text-gray-900">{fee.display_amount}</span>
        </div>
      ))}

      {order.discount_total &&
        Number.parseFloat(order.discount_total) !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t("discount")}</span>
            <span className="text-green-600">
              {order.display_discount_total}
            </span>
          </div>
        )}

      {Number.parseFloat(order.tax_total ?? "0") > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("tax")}</span>
          <span className="text-gray-900">{order.display_tax_total}</span>
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-gray-200">
        <span className="font-semibold text-gray-900">{t("total")}</span>
        <span className="font-semibold text-gray-900">
          {order.display_total}
        </span>
      </div>

      {order.gift_card &&
      Number.parseFloat(order.gift_card_total ?? "0") > 0 ? (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("giftCard")}</span>
          <span className="text-green-600">
            -{order.display_gift_card_total}
          </span>
        </div>
      ) : order.store_credit_total &&
        Number.parseFloat(order.store_credit_total) > 0 ? (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("storeCredit")}</span>
          <span className="text-green-600">
            -{order.display_store_credit_total}
          </span>
        </div>
      ) : null}

      {Number.parseFloat(order.amount_due ?? "0") > 0 &&
        order.amount_due !== order.total && (
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">
              {t("amountDue")}
            </span>
            <span className="font-semibold text-gray-900">
              {order.display_amount_due}
            </span>
          </div>
        )}
    </div>
  );
}
