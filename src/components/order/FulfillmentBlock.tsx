"use client";

import type { Address, Fulfillment, Order } from "@spree/sdk";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddressBlock } from "@/components/order/AddressBlock";
import { LineItemCard } from "@/components/order/LineItemCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getFulfillmentStatusColor, getStatusLabel } from "@/lib/utils/format";

interface FulfillmentBlockProps {
  fulfillment: Fulfillment;
  shipAddress: Address | null;
  basePath: string;
  lineItems: Order["items"];
}

// Statuses that no longer wait for tracking details; the 5.6 `shipped` too,
// for orders saved before the upgrade.
const HANDED_OVER_STATUSES = new Set([
  "canceled",
  "fulfilled",
  "delivered",
  "shipped",
]);

export function FulfillmentBlock({
  fulfillment,
  shipAddress,
  basePath,
  lineItems,
}: FulfillmentBlockProps) {
  const t = useTranslations("orders");
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:gap-6 gap-4">
          {shipAddress && (
            <div className="lg:w-1/2">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("deliveryAddress")}
              </h3>
              <AddressBlock address={shipAddress} />
            </div>
          )}
          <div className="lg:w-1/2 lg:flex justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t("shippingMethod")}
              </h3>
              <p className="text-sm text-gray-900">
                {fulfillment.delivery_method?.name || t("canceled")}
              </p>
              {fulfillment.stock_location && (
                <p className="text-xs text-gray-500 mt-1">
                  {t("shippedFrom", {
                    location: fulfillment.stock_location.name,
                  })}
                </p>
              )}
              <span
                className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-lg text-xs font-medium capitalize ${getFulfillmentStatusColor(fulfillment.status)}`}
              >
                {getStatusLabel(fulfillment.status, t)}
              </span>
            </div>
            <div className="mt-4 lg:mt-0">
              {fulfillment.status !== "canceled" && fulfillment.tracking_url ? (
                <Button size="sm" asChild>
                  <a
                    href={fulfillment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("trackItems")}
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  {t("trackItems")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {fulfillment.status === "canceled" && !fulfillment.fulfilled_at && (
          <Alert variant="destructive" className="mt-3">
            <CircleAlert />
            <AlertDescription>{t("shipmentCanceledRefund")}</AlertDescription>
          </Alert>
        )}
        {!HANDED_OVER_STATUSES.has(fulfillment.status) &&
          !fulfillment.tracking && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
              {t("noTrackingInfo")}
            </div>
          )}
      </div>

      <div className="divide-y divide-gray-200">
        {lineItems.map((item) => (
          <div key={item.id} className="px-6 py-4">
            <LineItemCard item={item} basePath={basePath} />
          </div>
        ))}
      </div>
    </div>
  );
}
