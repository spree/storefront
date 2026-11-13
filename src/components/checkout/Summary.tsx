"use client";

import type { Cart } from "@spree/sdk";
import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { PersonalizationSnapshot } from "@/components/products/PersonalizationSnapshot";
import { ProductImage } from "@/components/ui/product-image";

interface SummaryProps {
  cart: Cart;
}

export function Summary({ cart }: SummaryProps) {
  const tc = useTranslations("common");
  const tProducts = useTranslations("products");
  const t = useTranslations("checkout");
  const items = cart.items || [];
  const sellerGroups = items.reduce((groups, item) => {
    const key = item.seller_id ?? item.seller_name ?? "__marketplace";
    const group = groups.get(key) ?? { name: item.seller_name, items: [] };
    group.items.push(item);
    groups.set(key, group);
    return groups;
  }, new Map<string, { name: string | null; items: typeof items }>());
  const hasShipping = (cart.fulfillments?.length ?? 0) > 0;
  const personalizationFees = (cart.fees ?? []).filter(
    (fee) => fee.kind === "personalization",
  );

  return (
    <div>
      <h2 className="mb-5 text-lg font-semibold text-gray-950">
        {tc("orderSummary")}
      </h2>

      <div className="divide-y divide-gray-200 pb-6">
        {[...sellerGroups.entries()].map(([key, group]) => (
          <section key={key} className="py-4 first:pt-0 last:pb-0">
            {group.name && (
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Store className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span className="text-gray-500">{tProducts("soldBy")}</span>
                <span className="truncate">{group.name}</span>
              </h3>
            )}
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="relative h-16 w-16 flex-shrink-0">
                    <div className="relative h-full w-full overflow-hidden rounded-md border border-gray-200 bg-white">
                      <ProductImage
                        src={item.thumbnail_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        iconClassName="w-6 h-6"
                      />
                    </div>
                    <div className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[11px] font-medium text-white">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-gray-900">
                      {item.name}
                    </p>
                    {item.options_text && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {item.options_text}
                      </p>
                    )}
                    <PersonalizationSnapshot
                      snapshot={item.personalization_snapshot}
                      proofRequired={item.proof_required}
                      files={item.personalization_files}
                      compact
                      proofNoticeVariant="quiet"
                    />
                  </div>
                  <div className="whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.display_total}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Totals — Shopify style */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">{tc("subtotal")}</span>
          <span className="text-gray-900">{cart.display_item_total}</span>
        </div>

        {personalizationFees.map((fee) => (
          <div key={fee.id} className="flex justify-between text-sm">
            <span className="text-gray-700">{fee.label}</span>
            <span className="text-gray-900">{fee.display_amount}</span>
          </div>
        ))}

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
