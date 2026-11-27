"use client";

import type { Order } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LineItemGiftCardDetails } from "@/components/gift-cards/LineItemGiftCardDetails";
import { ProductImage } from "@/components/ui/product-image";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { lineItemAmount } from "@/lib/utils/price";

interface LineItemCardProps {
  item: Order["items"][number];
  basePath: string;
}

export function LineItemCard({ item, basePath }: LineItemCardProps) {
  const t = useTranslations("orders");
  const formatMoney = useFormatMoney();
  return (
    <div className="flex gap-4">
      <Link
        href={`${basePath}/products/${item.slug}`}
        className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0"
      >
        <ProductImage
          src={item.thumbnail_url}
          alt={item.name}
          fill
          className="object-cover"
          sizes="96px"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          href={`${basePath}/products/${item.slug}`}
          className="text-sm font-medium text-gray-900 hover:text-primary transition-colors line-clamp-2"
        >
          {item.name}
        </Link>
        <div className="mt-1 text-sm text-gray-900">
          {formatMoney(item.price, item.currency, { unitPrice: true })}
        </div>
        {item.options_text && (
          <p className="mt-1 text-xs text-gray-500">{item.options_text}</p>
        )}
        <LineItemGiftCardDetails item={item} />
        <p className="mt-1 text-xs text-gray-500">
          {t("qty", { quantity: item.quantity })}
        </p>
        <Link
          href={`${basePath}/products/${item.slug}`}
          className="mt-2 inline-block text-sm text-primary hover:text-primary font-medium"
        >
          {t("orderAgain")}
        </Link>
      </div>

      <div className="text-sm font-medium text-gray-900">
        {formatMoney(lineItemAmount(item), item.currency)}
      </div>
    </div>
  );
}
