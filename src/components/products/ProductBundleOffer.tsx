"use client";

import type { Price } from "@spree/sdk";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductImage } from "@/components/ui/product-image";
import { useCart } from "@/contexts/CartContext";

export type BundleOfferProduct = {
  id: string;
  name: string;
  slug: string;
  thumbnail_url?: string | null;
  default_variant_id?: string | null;
  price?: Price | null;
};

export type BundleOffer = {
  id: string;
  discount_kind?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  products: BundleOfferProduct[];
};

type PricedBundleProduct = BundleOfferProduct & {
  originalAmount: number | null;
  discountedAmount: number | null;
  currency: string;
};

function parseAmount(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : null;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function headingLabel(
  offer: BundleOffer,
  t: ReturnType<typeof useTranslations<"products">>,
): string {
  if (offer.discount_kind === "free_shipping") {
    return t("bundleOfferHeadingFreeShipping");
  }
  if (offer.discount_kind === "flat" && offer.discount_amount != null) {
    return t("bundleOfferHeadingFlat", {
      amount: formatMoney(
        offer.discount_amount,
        offer.products[0]?.price?.currency || "USD",
      ),
    });
  }
  if (offer.discount_percent != null) {
    return t("bundleOfferHeadingPercent", {
      percent: Math.round(offer.discount_percent),
    });
  }
  return t("bundleOfferHeadingDefault");
}

function offerTagLabel(
  offer: BundleOffer,
  t: ReturnType<typeof useTranslations<"products">>,
): string | null {
  if (offer.discount_kind === "free_shipping") {
    return t("bundleOfferTagFreeShipping");
  }
  if (offer.discount_kind === "flat" && offer.discount_amount != null) {
    return t("bundleOfferTagFlat", {
      amount: formatMoney(
        offer.discount_amount,
        offer.products[0]?.price?.currency || "USD",
      ),
    });
  }
  if (offer.discount_percent != null) {
    return t("bundleOfferTagPercent", {
      percent: Math.round(offer.discount_percent),
    });
  }
  return null;
}

function discountProduct(
  product: BundleOfferProduct,
  offer: BundleOffer,
): PricedBundleProduct {
  const currency = product.price?.currency || "USD";
  const originalAmount = parseAmount(product.price?.amount);
  let discountedAmount = originalAmount;

  if (originalAmount != null) {
    if (offer.discount_kind === "percent" && offer.discount_percent != null) {
      discountedAmount = Math.max(
        0,
        originalAmount * (1 - offer.discount_percent / 100),
      );
    } else if (
      offer.discount_kind === "flat" &&
      offer.discount_amount != null
    ) {
      discountedAmount = Math.max(0, originalAmount - offer.discount_amount);
    }
  }

  return {
    ...product,
    originalAmount,
    discountedAmount,
    currency,
  };
}

export function ProductBundleOffer({
  offer,
  currentProductId,
  basePath,
}: {
  offer: BundleOffer;
  currentProductId: string;
  basePath: string;
}) {
  const t = useTranslations("products");
  const { addItem, openCart } = useCart();
  const [pending, setPending] = useState(false);
  const products = useMemo(
    () => (offer.products ?? []).map((entry) => discountProduct(entry, offer)),
    [offer],
  );
  if (products.length < 2) return null;

  const currency = products.find((entry) => entry.currency)?.currency || "USD";
  const originalTotal = products.reduce(
    (sum, entry) => sum + (entry.originalAmount ?? 0),
    0,
  );
  const newTotal = products.reduce(
    (sum, entry) => sum + (entry.discountedAmount ?? entry.originalAmount ?? 0),
    0,
  );
  const showTotals =
    offer.discount_kind !== "free_shipping" &&
    products.every((entry) => entry.originalAmount != null);
  const showItemDiscount =
    offer.discount_kind === "percent" || offer.discount_kind === "flat";
  const tag = offerTagLabel(offer, t);
  const canAddAll = products.every((entry) =>
    Boolean(entry.default_variant_id),
  );

  async function addAllToCart() {
    if (!canAddAll || pending) return;
    setPending(true);
    try {
      for (const entry of products) {
        const variantId = entry.default_variant_id;
        if (!variantId) continue;
        const result = await addItem(variantId, 1);
        if (!result.success) {
          toast.error(result.error || t("bundleOfferAddAllError"));
          return;
        }
      }
      openCart();
    } catch {
      toast.error(t("bundleOfferAddAllError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="bg-white p-5"
      data-product-bundle-offer={offer.id}
      aria-label={headingLabel(offer, t)}
    >
      <h2 className="text-center text-[16px] font-semibold leading-snug text-[#222]">
        {headingLabel(offer, t)}
      </h2>

      <ul className="mt-5 flex flex-col gap-4">
        {products.map((entry) => {
          const isCurrent = entry.id === currentProductId;
          const row = (
            <span className="flex w-full items-start gap-3">
              <span className="relative flex size-16 shrink-0 overflow-hidden rounded-md bg-[#f2f2f2]">
                <ProductImage
                  src={entry.thumbnail_url}
                  alt=""
                  className="size-full object-cover"
                  sizes="64px"
                />
              </span>
              <span className="min-w-0 flex-1 space-y-1 pt-0.5">
                {isCurrent ? (
                  <span className="inline-flex rounded bg-[#e9e9e9] px-1.5 py-0.5 text-[11px] font-semibold text-[#222]">
                    {t("bundleOfferThisListing")}
                  </span>
                ) : null}
                <span className="line-clamp-2 block text-sm font-medium leading-snug text-[#222]">
                  {entry.name}
                </span>
                {entry.originalAmount != null ? (
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                    {showItemDiscount &&
                    entry.discountedAmount != null &&
                    entry.discountedAmount < entry.originalAmount ? (
                      <>
                        <span className="font-semibold text-[#222]">
                          {formatMoney(entry.discountedAmount, entry.currency)}
                        </span>
                        <span className="text-[#595959] line-through">
                          {formatMoney(entry.originalAmount, entry.currency)}
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-[#222]">
                        {formatMoney(entry.originalAmount, entry.currency)}
                      </span>
                    )}
                  </span>
                ) : null}
                {tag && showItemDiscount ? (
                  <span className="inline-flex text-[12px] font-medium text-[#258635]">
                    {tag}
                  </span>
                ) : null}
              </span>
            </span>
          );

          return (
            <li key={entry.id}>
              {isCurrent ? (
                row
              ) : (
                <Link
                  href={`${basePath}/products/${entry.slug}`}
                  className="block rounded-md transition-opacity hover:opacity-80"
                >
                  {row}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {showTotals ? (
        <div className="mt-4 space-y-1 border-t border-[#e1e3df] pt-3 text-sm">
          <div className="flex items-center justify-between gap-3 text-[#595959]">
            <span>{t("bundleOfferOriginalValue")}</span>
            <span>{formatMoney(originalTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 font-semibold text-[#222]">
            <span>{t("bundleOfferNewTotal")}</span>
            <span>{formatMoney(newTotal, currency)}</span>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canAddAll || pending}
        onClick={() => void addAllToCart()}
        className="mt-5 flex h-11 w-full items-center justify-center rounded-full border-2 border-[#222] bg-white text-[15px] font-semibold text-[#222] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("bundleOfferAddingAll") : t("bundleOfferAddAll")}
      </button>
    </section>
  );
}
