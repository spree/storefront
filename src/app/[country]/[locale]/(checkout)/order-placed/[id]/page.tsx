"use client";

import { CircleCheckBig, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { AddressBlock } from "@/components/order/AddressBlock";
import { OrderTotals } from "@/components/order/OrderTotals";
import { PaymentInfo } from "@/components/order/PaymentInfo";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { trackPurchase } from "@/lib/analytics/gtm";
import { getCompletedOrder } from "@/lib/data/checkout";
import { getCachedCompletedOrder } from "@/lib/utils/completed-order-cache";
import { extractBasePath } from "@/lib/utils/path";
import { type CompletedPurchase, toPurchase } from "@/lib/utils/purchase";

interface OrderPlacedPageProps {
  params: Promise<{
    id: string;
    country: string;
    locale: string;
  }>;
}

export default function OrderPlacedPage({ params }: OrderPlacedPageProps) {
  const { id: cartId } = use(params);
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const { setSummaryContent } = useCheckout();
  const t = useTranslations("orderPlaced");
  const tc = useTranslations("common");
  const formatMoney = useFormatMoney();

  const [result, setResult] = useState<CompletedPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"orderNotFound" | "failedToLoad" | null>(
    null,
  );

  // Clear sidebar summary
  useEffect(() => {
    setSummaryContent(null);
  }, [setSummaryContent]);

  // Track whether we've already loaded the order to avoid re-fetching
  // after the cart token cookie is cleared by CartProvider
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    let cancelled = false;

    async function loadOrder() {
      try {
        // Try cached order first (from the completion response),
        // fall back to API for page refreshes.
        const cached = getCachedCompletedOrder(
          cartId,
        ) as CompletedPurchase | null;
        const orderData = cached ?? (await getCompletedOrder(cartId));
        if (cancelled) return;

        loadedRef.current = true;

        if (orderData) {
          setResult(orderData);
          try {
            trackPurchase(orderData);
          } catch {
            // Analytics failure must not break the order confirmation UX
          }
        } else {
          setError("orderNotFound");
        }
        setLoading(false);
      } catch {
        if (!cancelled) {
          loadedRef.current = true;
          setError("failedToLoad");
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [cartId]);

  // One checkout, whether it produced one order or one per seller.
  const purchase = useMemo(
    () => (result ? toPurchase(result) : null),
    [result],
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 py-12">
        <div className="h-12 w-12 bg-gray-200 rounded-lg mx-auto" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
        <div className="h-64 bg-gray-200 rounded mt-8" />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t(error || "orderNotFound")}
        </h1>
        <Button asChild>
          <Link href={`${basePath}/`}>{tc("continueShopping")}</Link>
        </Button>
      </div>
    );
  }

  const customerName =
    purchase.billing_address?.full_name ||
    purchase.shipping_address?.full_name ||
    "";

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-10">
        <CircleCheckBig className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {customerName
            ? t("thanksForOrder", { name: customerName.split(" ")[0] })
            : t("thanksForOrderAnonymous")}
        </h1>
        <p className="text-gray-500">
          {t("orderNumber", { number: purchase.number })}
        </p>
        <p className="text-sm text-gray-400 mt-2">{t("emailConfirmation")}</p>
        {purchase.split && (
          <p className="text-sm text-gray-500 mt-2">
            {t("splitDeliveries", { count: purchase.segments.length })}
          </p>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {t("orderItems")}
          </h2>
        </div>

        {/* One block per order the checkout produced — a single-seller checkout
            has exactly one, so it reads as a plain list. */}
        {purchase.segments.map((segment, index) => (
          <div key={segment.id}>
            {purchase.split && (
              <div className="px-6 py-3 bg-gray-50 border-y border-gray-200 flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t("deliveryOf", {
                    index: index + 1,
                    count: purchase.segments.length,
                  })}
                </h3>
                <span className="text-xs text-gray-500">{segment.number}</span>
              </div>
            )}
            <ul className="divide-y divide-gray-200">
              {segment.items.map((item) => (
                <li key={item.id} className="px-6 py-4 flex gap-4">
                  <div className="relative w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                    <ProductImage
                      src={item.thumbnail_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      iconClassName="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">
                      {item.name}
                    </h3>
                    {item.options_text && (
                      <p className="text-sm text-gray-500">
                        {item.options_text}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {t("qty", { quantity: item.quantity })}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatMoney(item.total, item.currency)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Totals */}
        <div className="px-6 py-4 border-t border-gray-200">
          <OrderTotals order={purchase.totals} />
        </div>
      </div>

      {/* Shipping & Payment */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Shipping Method */}
          {purchase.fulfillments.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t("shippingMethod")}
              </h3>
              {purchase.fulfillments.map((fulfillment) => (
                <div
                  key={fulfillment.id}
                  className="flex items-start gap-3 mb-2 last:mb-0"
                >
                  <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {fulfillment.delivery_method?.name ||
                        t("standardShipping")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatMoney(fulfillment.cost, purchase.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Information */}
          {purchase.payments.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t("payment")}
              </h3>
              {purchase.payments
                .filter((p) => p.status !== "void" && p.status !== "invalid")
                .map((payment) => (
                  <div key={payment.id} className="mb-3 last:mb-0">
                    <PaymentInfo
                      payment={payment}
                      currency={purchase.currency}
                      giftCardTotal={purchase.totals.gift_card_total}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact & Addresses */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          {purchase.shipping_address && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("shippingAddress")}
              </h3>
              <AddressBlock address={purchase.shipping_address} />
            </div>
          )}

          {purchase.billing_address && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("billingAddress")}
              </h3>
              <AddressBlock address={purchase.billing_address} />
            </div>
          )}
        </div>

        {purchase.email && (
          <div className="px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {t("confirmationSentTo")}{" "}
              <span className="font-medium text-gray-700">
                {purchase.email}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="text-center">
        <Button size="lg" asChild>
          <Link href={`${basePath}/`}>{tc("continueShopping")}</Link>
        </Button>
      </div>
    </div>
  );
}
