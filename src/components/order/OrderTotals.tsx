import type { Cart, Order, OrderGroup } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { useFormatMoney } from "@/hooks/useFormatMoney";

type OrderLike = Cart | Order | OrderGroup;

interface OrderTotalsProps {
  order: OrderLike;
}

export function OrderTotals({ order }: OrderTotalsProps) {
  const t = useTranslations("common");
  const formatMoney = useFormatMoney();

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">{t("subtotal")}</span>
        <span className="text-gray-900">
          {formatMoney(order.item_total, order.currency)}
        </span>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-500">{t("shipping")}</span>
        <span className="text-gray-900">
          {formatMoney(order.delivery_total, order.currency)}
        </span>
      </div>

      {order.discount_total &&
        Number.parseFloat(order.discount_total) !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t("discount")}</span>
            <span className="text-green-600">
              {formatMoney(order.discount_total, order.currency)}
            </span>
          </div>
        )}

      {Number.parseFloat(order.tax_total ?? "0") > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("tax")}</span>
          <span className="text-gray-900">
            {formatMoney(order.tax_total, order.currency)}
          </span>
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-gray-200">
        <span className="font-semibold text-gray-900">{t("total")}</span>
        <span className="font-semibold text-gray-900">
          {formatMoney(order.total, order.currency)}
        </span>
      </div>

      {/* Store credit excludes what a gift card paid, so both rows can show. */}
      {Number.parseFloat(order.gift_card_total ?? "0") > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("giftCard")}</span>
          <span className="text-green-600">
            -{formatMoney(order.gift_card_total, order.currency)}
          </span>
        </div>
      )}
      {Number.parseFloat(order.store_credit_total ?? "0") > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("storeCredit")}</span>
          <span className="text-green-600">
            -{formatMoney(order.store_credit_total, order.currency)}
          </span>
        </div>
      )}

      {Number.parseFloat(order.amount_due ?? "0") > 0 &&
        order.amount_due !== order.total && (
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">
              {t("amountDue")}
            </span>
            <span className="font-semibold text-gray-900">
              {formatMoney(order.amount_due, order.currency)}
            </span>
          </div>
        )}
    </div>
  );
}
