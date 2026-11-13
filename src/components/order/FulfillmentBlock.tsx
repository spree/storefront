"use client";

import type { Address, Fulfillment, Order, OrderProof } from "@spree/sdk";
import { CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddressBlock } from "@/components/order/AddressBlock";
import { LineItemCard } from "@/components/order/LineItemCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { LineItemReviewState } from "@/lib/reviews/line-item-review-state";
import { getFulfillmentStatusColor } from "@/lib/utils/format";

interface FulfillmentBlockProps {
  fulfillment: Fulfillment;
  shipAddress: Address | null;
  basePath: string;
  lineItems: Order["items"];
  lineItemReviewStates?: Record<string, LineItemReviewState>;
  orderId?: string;
  proofs?: OrderProof[];
}

export function FulfillmentBlock({
  fulfillment,
  shipAddress,
  basePath,
  lineItems,
  lineItemReviewStates = {},
  orderId,
  proofs = [],
}: FulfillmentBlockProps) {
  const t = useTranslations("orders");
  return (
    <div className="overflow-hidden rounded-lg border border-marketplace-border-subtle bg-marketplace-surface">
      <div className="border-b border-marketplace-border-subtle bg-marketplace-surface-warm/35 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:gap-6 gap-4">
          {shipAddress && (
            <div className="lg:w-1/2">
              <h3 className="mb-2 text-sm font-semibold text-marketplace-foreground">
                {t("deliveryAddress")}
              </h3>
              <AddressBlock address={shipAddress} />
            </div>
          )}
          <div className="lg:w-1/2 lg:flex justify-between">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-marketplace-foreground">
                {t("shipment")}
              </h3>
              {fulfillment.delivery_method?.name ? (
                <p className="text-sm font-medium text-marketplace-foreground">
                  {fulfillment.delivery_method.name}
                </p>
              ) : null}
              {fulfillment.stock_location && (
                <p className="mt-1 text-xs text-marketplace-muted-foreground">
                  {t("shippedFrom", {
                    location: fulfillment.stock_location.name,
                  })}
                </p>
              )}
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getFulfillmentStatusColor(fulfillment.status)}`}
              >
                {fulfillment.status}
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
              ) : null}
            </div>
          </div>
        </div>

        {fulfillment.status === "canceled" && !fulfillment.fulfilled_at && (
          <Alert variant="destructive" className="mt-3">
            <CircleAlert />
            <AlertDescription>{t("shipmentCanceledRefund")}</AlertDescription>
          </Alert>
        )}
        {fulfillment.status !== "canceled" && !fulfillment.tracking && (
          <div className="mt-3 rounded-md bg-marketplace-surface-subtle p-3 text-center text-sm text-marketplace-muted-foreground">
            {t("noTrackingInfo")}
          </div>
        )}
      </div>

      <div className="divide-y divide-marketplace-border-subtle">
        {lineItems.map((item) => (
          <div key={item.id} className="p-4 sm:p-5">
            <LineItemCard
              item={item}
              basePath={basePath}
              orderId={orderId}
              proofs={proofs}
              reviewState={lineItemReviewStates[item.id]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
