"use client";

import type { Cart } from "@spree/sdk";
import { useTranslations } from "next-intl";
import { ProductImage } from "@/components/ui/product-image";

interface SummaryProps {
  cart: Cart;
}

export function Summary({ cart }: SummaryProps) {
  const tc = useTranslations("common");
  const t = useTranslations("checkout");
  const items = cart.items || [];
  const hasShipping = (cart.fulfillments?.length ?? 0) > 0;

  return (
    <div>
      {/* Line items */}
      <div className="space-y-4 pb-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="relative w-[64px] h-[64px] flex-shrink-0">
              <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <ProductImage
                  src={item.thumbnail_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  iconClassName="w-6 h-6"
                />
              </div>
              {/* Quantity badge — Shopify style: top-right, dark bg */}
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-[rgba(114,114,114,0.9)] text-white text-[11px] font-medium rounded-full flex items-center justify-center">
                {item.quantity}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {item.name}
              </p>
              {item.options_text && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.options_text}
                </p>
              )}
            </div>
            <div className="text-sm text-gray-900">{item.display_total}</div>
          </div>
        ))}
      </div>

      {/* Totals — Shopify style */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">{tc("subtotal")}</span>
          <span className="text-gray-900">{cart.display_item_total}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-700">{tc("shipping")}</span>
          {hasShipping ? (
            <span className="text-gray-900">{cart.display_delivery_total}</span>
          ) : (
            <span className="text-xs text-gray-500">
              {t("enterShippingAddress")}
            </span>
          )}
        </div>

        {(cart.fees ?? []).map((fee) => (
          <div key={fee.id} className="flex justify-between text-sm">
            <span className="text-gray-700">{fee.label}</span>
            <span className="text-gray-900">{fee.display_amount}</span>
          </div>
        ))}

        {cart.discount_total && parseFloat(cart.discount_total) !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">{tc("discount")}</span>
            <span className="text-green-700">
              {cart.display_discount_total}
            </span>
          </div>
        )}

        {parseFloat(cart.tax_total ?? "0") > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">{tc("tax")}</span>
            <span className="text-gray-900">{cart.display_tax_total}</span>
          </div>
        )}

        {/* Total row */}
        <div className="flex justify-between items-baseline pt-3 border-t border-gray-200">
          <span className="text-base font-bold text-gray-900">
            {tc("total")}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-gray-500 uppercase">
              {cart.currency}
            </span>
            <span className="text-xl font-bold text-gray-900">
              {cart.display_total}
            </span>
          </div>
        </div>

        {/* Gift card or store credit — shown below total, reduces amount due.
            Gift cards use store credits under the hood, so only show one. */}
        {cart.gift_card && parseFloat(cart.gift_card_total ?? "0") > 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">{tc("giftCard")}</span>
            <span className="text-green-700">
              -{cart.display_gift_card_total}
            </span>
          </div>
        ) : cart.store_credit_total &&
          parseFloat(cart.store_credit_total) > 0 ? (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">{tc("storeCredit")}</span>
            <span className="text-green-700">
              -{cart.display_store_credit_total}
            </span>
          </div>
        ) : null}

        {/* Amount due — only shown when gift card or store credit is applied */}
        {cart.amount_due &&
          cart.amount_due !== cart.total &&
          parseFloat(cart.amount_due) > 0 && (
            <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
              <span className="text-base font-bold text-gray-900">
                {tc("amountDue")}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-500 uppercase">
                  {cart.currency}
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {cart.display_amount_due}
                </span>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
