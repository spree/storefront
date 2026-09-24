"use client";

import type { LineItem } from "@spree/sdk";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { QuantityPickerField } from "@/components/cart/QuantityPickerField";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { useCart } from "@/contexts/CartContext";
import { extractBasePath } from "@/lib/utils/path";
import { WHOLESALE_MIN_QUANTITY } from "@/lib/wholesale";

/**
 * Wholesale cart view. Reads the wholesale-bound cart from useCart() (the gate
 * wraps this subtree in a wholesale <CartProvider>). "Continue shopping" returns
 * to the wholesale catalog; the checkout button hands off to the shared
 * (checkout) flow, which resolves the wholesale surface from the cart id.
 */
export function WholesaleCartView() {
  const { cart, loading, updating, updateItem, removeItem } = useCart();
  const pathname = usePathname();
  // extractBasePath strips to /{country}/{locale}; the shared checkout lives there.
  const storeBase = extractBasePath(pathname);
  const wholesaleBase = `${storeBase}/wholesale`;
  const t = useTranslations("cart");
  const tc = useTranslations("common");
  const tw = useTranslations("wholesale");

  const handleRemove = async (item: LineItem) => {
    await removeItem(item.id);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="mb-8 h-8 w-32 rounded bg-slate-200" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <ShoppingBag
            className="mx-auto h-24 w-24 text-slate-300"
            strokeWidth={1}
          />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {t("emptyCart")}
          </h1>
          <p className="mt-2 text-slate-500">{tw("cart.emptyDescription")}</p>
          <div className="mt-6">
            <Button
              size="lg"
              asChild
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Link href={wholesaleBase}>{tw("cart.browseCatalog")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-slate-900">
        {tw("cart.title")}
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="divide-y rounded-xl border border-slate-200 bg-white">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-6 p-6">
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <ProductImage
                    src={item.thumbnail_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-medium text-slate-900">
                    {item.name}
                  </h3>
                  {item.options_text && (
                    <p className="mt-1 text-sm text-slate-500">
                      {item.options_text}
                    </p>
                  )}
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {item.display_price ?? "—"}
                  </p>
                  {item.quantity < WHOLESALE_MIN_QUANTITY ? (
                    <p className="mt-2 text-sm font-medium text-amber-700">
                      {tw("cart.unlockNudge", {
                        count: WHOLESALE_MIN_QUANTITY - item.quantity,
                      })}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-green-600">
                      {tw("cart.tradePriceApplied")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <QuantityPickerField
                    quantity={item.quantity}
                    onQuantityChange={(quantity) =>
                      updateItem(item.id, quantity)
                    }
                    disabled={updating}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    aria-label={t("removeItemLabel", { name: item.name })}
                    onClick={() => handleRemove(item)}
                    disabled={updating}
                  >
                    {tc("remove")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium text-slate-900">
              {tc("orderSummary")}
            </h2>

            <dl className="mt-6 space-y-4">
              <div className="flex justify-between">
                <dt className="text-slate-500">{tc("subtotal")}</dt>
                <dd className="text-slate-900">
                  {cart.display_item_total ?? "—"}
                </dd>
              </div>
              {cart.discount_total && parseFloat(cart.discount_total) < 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>{tc("discount")}</dt>
                  <dd>{cart.display_discount_total}</dd>
                </div>
              )}
              {(cart.fees ?? []).map((fee) => (
                <div key={fee.id} className="flex justify-between">
                  <dt className="text-slate-500">{fee.label}</dt>
                  <dd className="text-slate-900">{fee.display_amount}</dd>
                </div>
              ))}
              {cart.tax_total && parseFloat(cart.tax_total) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{tc("tax")}</dt>
                  <dd className="text-slate-900">{cart.display_tax_total}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-4">
                <dt className="text-lg font-medium text-slate-900">
                  {tc("total")}
                </dt>
                <dd className="text-lg font-bold text-slate-900">
                  {cart.display_total ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 space-y-3">
              <Button
                size="lg"
                asChild
                className="w-full bg-slate-900 hover:bg-slate-800"
              >
                <Link href={`${storeBase}/checkout/${cart.id}`}>
                  {t("proceedToCheckout")}
                </Link>
              </Button>
              <Button variant="link" asChild className="w-full">
                <Link href={wholesaleBase}>{tw("cart.browseCatalog")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
