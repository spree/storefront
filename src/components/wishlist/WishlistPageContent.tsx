"use client";

import type { Variant, WishlistItem } from "@spree/sdk";
import { AlertCircle, Heart, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { extractBasePath } from "@/lib/utils/path";

type VariantWithProduct = Variant & {
  name?: string;
  slug?: string;
  product_name?: string;
  product_slug?: string;
  product?: {
    name?: string;
    slug?: string;
    thumbnail_url?: string | null;
    primary_media?: {
      original_url?: string | null;
    } | null;
    attributes?: {
      name?: string;
      slug?: string;
      thumbnail_url?: string | null;
    };
  };
};

type WishlistItemWithDisplay = WishlistItem & {
  name?: string;
  slug?: string;
  product_name?: string;
  product_slug?: string;
  thumbnail_url?: string | null;
  product?: {
    name?: string;
    slug?: string;
    thumbnail_url?: string | null;
    primary_media?: {
      original_url?: string | null;
    } | null;
    attributes?: {
      name?: string;
      slug?: string;
      thumbnail_url?: string | null;
    };
  };
};

function getDisplayFields(item: WishlistItem) {
  const wishlistItem = item as WishlistItemWithDisplay;
  const variant = item.variant as VariantWithProduct;
  const itemProduct = wishlistItem.product;
  const itemProductAttributes = itemProduct?.attributes;
  const product = variant.product;
  const productAttributes = product?.attributes;

  const variantName =
    variant.name && variant.name !== "Product" ? variant.name : undefined;

  const productName =
    itemProduct?.name ||
    itemProductAttributes?.name ||
    product?.name ||
    productAttributes?.name ||
    wishlistItem.product_name ||
    variant.product_name ||
    wishlistItem.name ||
    variantName ||
    variant.sku ||
    "Product";

  const productSlug =
    itemProduct?.slug ||
    itemProductAttributes?.slug ||
    product?.slug ||
    productAttributes?.slug ||
    wishlistItem.product_slug ||
    variant.product_slug ||
    wishlistItem.slug ||
    variant.slug;

  const imageUrl =
    variant.thumbnail_url ||
    itemProduct?.thumbnail_url ||
    wishlistItem.thumbnail_url ||
    itemProductAttributes?.thumbnail_url ||
    itemProduct?.primary_media?.original_url ||
    product?.thumbnail_url ||
    product?.primary_media?.original_url ||
    productAttributes?.thumbnail_url ||
    null;

  return { productName, productSlug, imageUrl };
}

export function WishlistPageContent() {
  const t = useTranslations("wishlist");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const basePath = extractBasePath(pathname);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const {
    wishlist,
    loading,
    updating,
    error,
    refreshWishlist,
    removeItemByVariant,
  } = useWishlist();
  const { addItem } = useCart();
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-28 bg-gray-200 rounded" />
          <div className="h-28 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-xl mx-auto text-center">
          <Heart className="w-20 h-20 text-gray-300 mx-auto" strokeWidth={1} />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {t("myWishlist")}
          </h1>
          <p className="mt-2 text-gray-500">{t("signInRequired")}</p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link
                href={`${basePath}/account?redirect=${encodeURIComponent(pathname)}`}
              >
                {t("signInToView")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const items = wishlist?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <Heart className="w-24 h-24 text-gray-300 mx-auto" strokeWidth={1} />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {t("emptyTitle")}
          </h1>
          <p className="mt-2 text-gray-500">{t("emptyDescription")}</p>
          <div className="mt-6">
            <Button size="lg" asChild>
              <Link href={`${basePath}/products`}>
                {tc("continueShopping")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("myWishlist")}</h1>
        <Button variant="outline" size="sm" onClick={() => refreshWishlist()}>
          {t("refresh")}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {items.map((item) => {
          const { productName, productSlug, imageUrl } = getDisplayFields(item);

          return (
            <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-5">
              <div className="relative w-full h-24 overflow-hidden rounded-xl bg-gray-100 sm:w-24 shrink-0">
                <ProductImage
                  src={imageUrl}
                  alt={productName}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-medium text-gray-900 truncate">
                  {productSlug ? (
                    <Link
                      href={`${basePath}/products/${productSlug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {productName}
                    </Link>
                  ) : (
                    productName
                  )}
                </h2>

                {item.variant.options_text && (
                  <p className="mt-1 text-sm text-gray-500">
                    {item.variant.options_text}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-6 text-sm text-gray-600">
                  <span>{t("quantity", { quantity: item.quantity })}</span>
                  {item.variant.price?.display_amount && (
                    <span className="font-semibold text-gray-900">
                      {item.variant.price.display_amount}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={
                      addingVariantId !== null || !item.variant.purchasable
                    }
                    onClick={async () => {
                      setAddingVariantId(item.variant_id);
                      try {
                        await addItem(item.variant_id, item.quantity || 1);
                      } finally {
                        setAddingVariantId(null);
                      }
                    }}
                  >
                    {addingVariantId === item.variant_id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("addingToCart")}
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        {t("addToCart")}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={updating}
                    onClick={async () => removeItemByVariant(item.variant_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("remove")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
