"use client";

import type { Cart, Order, OrderGroup, Payment } from "@spree/sdk";
import { isOrderGroup } from "@spree/sdk";
import { CircleCheckBig, Package } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { use, useEffect, useRef, useState } from "react";
import { AddressBlock } from "@/components/order/AddressBlock";
import { OrderTotals } from "@/components/order/OrderTotals";
import { PaymentInfo } from "@/components/order/PaymentInfo";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { useCheckout } from "@/contexts/CheckoutContext";
import { trackPurchase } from "@/lib/analytics/gtm";
import { getCompletedOrder, getCompletedOrders } from "@/lib/data/checkout";
import {
  type CompletedCheckout,
  getCachedCompletedOrder,
} from "@/lib/utils/completed-order-cache";
import { ORDER_IDS_PARAM, parseOrderIds } from "@/lib/utils/order-placed";
import { extractBasePath } from "@/lib/utils/path";

type PlacedOrder = Cart | Order;

/**
 * What the checkout produced: one order, or — for a marketplace cart spanning
 * several sellers — one order per seller. `group` is only known when the page
 * was reached straight from the completion response; after a refresh the
 * orders are fetched one by one and the group itself isn't available.
 */
interface PlacedCheckout {
  orders: PlacedOrder[];
  group: OrderGroup | null;
}

function fromCompletion(result: CompletedCheckout): PlacedCheckout {
  return isOrderGroup(result)
    ? { orders: result.orders, group: result }
    : { orders: [result], group: null };
}

async function loadPlacedCheckout(
  cartId: string,
  orderIds: string[],
): Promise<PlacedCheckout | null> {
  // Try the cached completion response first, fall back to the API for page
  // refreshes. A split checkout can't be fetched by cart id, so its order ids
  // travel in the URL and each order is fetched on its own.
  const cached = getCachedCompletedOrder(cartId);
  if (cached) return fromCompletion(cached);

  if (orderIds.length > 0) {
    const orders = await getCompletedOrders(cartId, orderIds);
    return orders.length > 0 ? { orders, group: null } : null;
  }

  const order = await getCompletedOrder(cartId);
  return order ? { orders: [order], group: null } : null;
}

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
  const searchParams = useSearchParams();
  const orderIdsParam = searchParams.get(ORDER_IDS_PARAM);
  const basePath = extractBasePath(pathname);
  const { setSummaryContent } = useCheckout();
  const t = useTranslations("orderPlaced");
  const tc = useTranslations("common");

  const [placed, setPlaced] = useState<PlacedCheckout | null>(null);
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
        const placedData = await loadPlacedCheckout(
          cartId,
          parseOrderIds(orderIdsParam),
        );
        if (cancelled) return;

        loadedRef.current = true;

        if (placedData) {
          setPlaced(placedData);
          // One purchase event per order: each is its own transaction,
          // fulfilled and paid out to its own seller.
          for (const placedOrder of placedData.orders) {
            try {
              trackPurchase(placedOrder);
            } catch {
              // Analytics failure must not break the order confirmation UX
            }
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
  }, [cartId, orderIdsParam]);

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

  if (error || !placed || placed.orders.length === 0) {
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

  const { orders, group } = placed;
  const isSplit = orders.length > 1;
  // Addresses, email and the customer's name are the same on every order a
  // split produced; the group carries them too.
  const order = group ?? orders[0];
  const orderNumber = group?.number ?? (isSplit ? null : orders[0].number);

  const customerName =
    order.billing_address?.full_name || order.shipping_address?.full_name || "";

  const fulfillments = orders.flatMap((o) => o.fulfillments ?? []);
  const payments = uniqueById(orders.flatMap((o) => o.payments ?? [])).filter(
    (p) => p.status !== "void" && p.status !== "invalid",
  );
  const hasGiftCard = orders.some((o) => o.gift_card);

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
        {orderNumber && (
          <p className="text-gray-500">
            {t("orderNumber", { number: orderNumber })}
          </p>
        )}
        {isSplit && (
          <p className="text-sm text-gray-500 mt-2">
            {t("splitIntoOrders", { count: orders.length })}
          </p>
        )}
        <p className="text-sm text-gray-400 mt-2">{t("emailConfirmation")}</p>
      </div>

      {/* Order Items — one card per order when the checkout was split */}
      {orders.map((placedOrder) => (
        <div
          key={placedOrder.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {isSplit
                ? t("orderNumber", { number: placedOrder.number })
                : t("orderItems")}
            </h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {placedOrder.items?.map((item) => (
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
                    <p className="text-sm text-gray-500">{item.options_text}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {t("qty", { quantity: item.quantity })}
                  </p>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {item.display_total}
                </div>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-gray-200">
            <OrderTotals order={placedOrder} />
          </div>
        </div>
      ))}

      {/* Grand total across a split checkout's orders */}
      {isSplit && group?.display_total && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 mb-6 flex justify-between">
          <span className="text-base font-semibold text-gray-900">
            {tc("total")}
          </span>
          <span className="text-base font-semibold text-gray-900">
            {group.display_total}
          </span>
        </div>
      )}

      {/* Shipping & Payment */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Shipping Method */}
          {fulfillments.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t("shippingMethod")}
              </h3>
              {fulfillments.map((fulfillment) => (
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
                      {fulfillment.display_cost}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Information */}
          {payments.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {t("payment")}
              </h3>
              {payments.map((payment) => (
                <div key={payment.id} className="mb-3 last:mb-0">
                  <PaymentInfo
                    payment={payment}
                    storeCreditLabel={hasGiftCard ? t("giftCard") : undefined}
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
          {order.shipping_address && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("shippingAddress")}
              </h3>
              <AddressBlock address={order.shipping_address} />
            </div>
          )}

          {order.billing_address && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("billingAddress")}
              </h3>
              <AddressBlock address={order.billing_address} />
            </div>
          )}
        </div>

        {order.email && (
          <div className="px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {t("confirmationSentTo")}{" "}
              <span className="font-medium text-gray-700">{order.email}</span>
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

function uniqueById(payments: Payment[]): Payment[] {
  const seen = new Set<string>();
  return payments.filter((payment) => {
    if (seen.has(payment.id)) return false;
    seen.add(payment.id);
    return true;
  });
}
