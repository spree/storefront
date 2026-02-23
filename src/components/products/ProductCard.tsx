"use client";

import type { StoreProduct } from "@spree/sdk";
import Image from "next/image";
import Link from "next/link";
import { ImagePlaceholderIcon } from "@/components/icons";
import { useStore } from "@/contexts/StoreContext";
import { trackSelectItem } from "@/lib/analytics/gtm";

interface ProductCardProps {
  product: StoreProduct;
  basePath?: string;
  index?: number;
  listId?: string;
  listName?: string;
}

export function ProductCard({
  product,
  basePath = "",
  index,
  listId,
  listName,
}: ProductCardProps) {
  const { currency } = useStore();
  const imageUrl = product.thumbnail_url || null;

  // Current display price
  const displayPrice = product.price?.display_amount;

  // Compute on_sale locally: product is on sale if current price is less than original price
  // or if compare_at_amount is set (manual markdown)
  // Use amount_in_cents for comparison (integers, no floating point issues)
  const currentAmountCents = product.price?.amount_in_cents;
  const originalAmountCents = product.original_price?.amount_in_cents;
  const compareAtAmountCents = product.price?.compare_at_amount_in_cents;
  const onSale =
    (currentAmountCents != null &&
      originalAmountCents != null &&
      currentAmountCents < originalAmountCents) ||
    (compareAtAmountCents != null &&
      currentAmountCents != null &&
      currentAmountCents < compareAtAmountCents);

  // Strikethrough price: show original_price if different from current, or compare_at_amount for manual markdowns
  const strikethroughPrice = onSale
    ? product.original_price?.display_amount !== displayPrice
      ? product.original_price?.display_amount
      : product.price?.display_compare_at_amount
    : null;

  const handleClick = () => {
    if (index != null && listId && listName) {
      trackSelectItem(product, listId, listName, index, currency);
    }
  };

  return (
    <Link
      href={`${basePath}/products/${product.slug}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <ImagePlaceholderIcon className="w-16 h-16" />
          </div>
        )}
        {onSale && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
            Sale
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary-500 transition-colors line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          {displayPrice && (
            <span className="text-lg font-semibold text-gray-900">
              {displayPrice}
            </span>
          )}
          {onSale && strikethroughPrice && (
            <span className="text-sm text-gray-500 line-through">
              {strikethroughPrice}
            </span>
          )}
        </div>

        {!product.purchasable && (
          <span className="mt-2 text-sm text-gray-500">Out of Stock</span>
        )}
      </div>
    </Link>
  );
}
