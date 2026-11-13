"use client";

import { Tag } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export type OrderMinimumDeal = {
  id?: string;
  discount_kind?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  order_minimum_amount?: number | null;
  order_minimum_quantity?: number | null;
  currency?: string | null;
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function dealMessage(
  deal: OrderMinimumDeal,
  t: ReturnType<typeof useTranslations<"products">>,
): string | null {
  const currency = deal.currency || "USD";
  const quantity = deal.order_minimum_quantity;
  const minimumAmount = deal.order_minimum_amount;

  if (deal.discount_kind === "free_shipping") {
    if (quantity != null && quantity > 0) {
      return t("orderMinimumDealFreeShippingQuantity", { count: quantity });
    }
    if (minimumAmount != null && minimumAmount > 0) {
      return t("orderMinimumDealFreeShippingAmount", {
        amount: formatMoney(minimumAmount, currency),
      });
    }
    return null;
  }

  if (deal.discount_kind === "flat" && deal.discount_amount != null) {
    const savings = formatMoney(deal.discount_amount, currency);
    if (quantity != null && quantity > 0) {
      return t("orderMinimumDealFlatQuantity", {
        amount: savings,
        count: quantity,
      });
    }
    if (minimumAmount != null && minimumAmount > 0) {
      return t("orderMinimumDealFlatAmount", {
        amount: savings,
        minimum: formatMoney(minimumAmount, currency),
      });
    }
    return null;
  }

  if (deal.discount_percent != null) {
    const percent = Math.round(deal.discount_percent);
    if (quantity != null && quantity > 0) {
      return t("orderMinimumDealPercentQuantity", { percent, count: quantity });
    }
    if (minimumAmount != null && minimumAmount > 0) {
      return t("orderMinimumDealPercentAmount", {
        percent,
        amount: formatMoney(minimumAmount, currency),
      });
    }
  }

  return null;
}

export function ProductOrderMinimumDeal({
  deal,
  shopHref,
}: {
  deal: OrderMinimumDeal;
  shopHref: string | null;
}) {
  const t = useTranslations("products");
  const message = dealMessage(deal, t);
  if (!message) return null;

  return (
    <div className="order-5 space-y-1" data-testid="order-minimum-deal">
      <p className="flex items-start gap-2 text-sm font-medium text-[#258635]">
        <Tag className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{message}</span>
      </p>
      {shopHref ? (
        <Link
          href={shopHref}
          className="ml-6 inline-block text-sm font-medium text-[#258635] underline underline-offset-2 hover:text-[#1e6b2b]"
        >
          {t("orderMinimumDealShopTheDeal")}
        </Link>
      ) : null}
    </div>
  );
}
