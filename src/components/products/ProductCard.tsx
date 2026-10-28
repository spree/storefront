"use client";

import type { Product } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { HiddenPricePrompt } from "@/components/products/HiddenPricePrompt";
import { ProductImage } from "@/components/ui/product-image";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { trackSelectItem } from "@/lib/analytics/gtm";
import { strikethroughAmount } from "@/lib/utils/price";

interface ProductCardProps {
  product: Product;
  basePath?: string;
  categoryId?: string;
  index?: number;
  listId?: string;
  listName?: string;
  fetchPriority?: "high" | "low" | "auto";
  /** Optional currency used for analytics; omit to skip the select_item event. */
  currency?: string;
}

export const ProductCard = memo(function ProductCard({
  product,
  basePath = "",
  categoryId,
  index,
  listId,
  listName,
  fetchPriority,
  currency,
}: ProductCardProps) {
  const t = useTranslations("products");
  const imageUrl = product.thumbnail_url || null;

  const formatMoney = useFormatMoney();
  const price = product.price;
  const displayPrice = price
    ? formatMoney(price.amount, price.currency, { unitPrice: true })
    : null;
  const struckAmount = strikethroughAmount(price, product.original_price);
  const onSale = struckAmount !== null;
  const strikethroughPrice =
    price && struckAmount
      ? formatMoney(struckAmount, price.currency, { unitPrice: true })
      : null;

  const handleClick = () => {
    if (index != null && listId && listName && currency) {
      trackSelectItem(product, listId, listName, index, currency);
    }
  };

  return (
    <div className="group relative">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 rounded-md overflow-hidden">
        <ProductImage
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 300px"
          iconClassName="w-16 h-16"
          fetchPriority={fetchPriority}
        />
        {onSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
            {t("sale")}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
          {/* Stretched link: the ::after overlay keeps the whole card clickable
              without wrapping the content in an <a> — HiddenPricePrompt renders
              its own link, and anchors can't nest. */}
          <Link
            href={`${basePath}/products/${product.slug}${categoryId ? `?category_id=${categoryId}` : ""}`}
            className="after:absolute after:inset-0"
            onClick={handleClick}
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-2 flex items-center gap-2">
          {displayPrice ? (
            <span className="text-lg font-semibold text-gray-900">
              {displayPrice}
            </span>
          ) : (
            // Null price: a deliberate hide inside a HiddenPricingProvider
            // (renders a sign-in prompt), otherwise renders nothing.
            <HiddenPricePrompt />
          )}
          {onSale && strikethroughPrice && (
            <span className="text-sm text-gray-500 line-through">
              {strikethroughPrice}
            </span>
          )}
        </div>

        {!product.purchasable && (
          <span className="mt-2 text-sm text-gray-500">{t("outOfStock")}</span>
        )}
      </div>
    </div>
  );
});
