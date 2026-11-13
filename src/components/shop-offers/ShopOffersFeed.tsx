"use client";

import type { Product, ShopOffer } from "@spree/sdk";
import { Tag } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProductImage } from "@/components/ui/product-image";
import { formatRelativeAge } from "@/lib/utils/relative-age";

interface ShopOffersFeedProps {
  offers: ShopOffer[];
  productsById: Map<string, Product>;
  basePath: string;
}

function offerHeadline(
  offer: ShopOffer,
  t: ReturnType<typeof useTranslations<"offers">>,
) {
  const seller = offer.seller_name || t("aSeller");
  if (offer.expired || !offer.available) {
    return t("sellerOfferExpired", { seller });
  }
  if (
    offer.source === "abandoned_cart" ||
    offer.source === "interested_shopper"
  ) {
    return t("cartOnSale");
  }
  if (offer.source === "favorited_item") {
    return t("savedItemOnSale");
  }
  if (offer.source === "thank_you") {
    return t("thankYouOffer", { seller });
  }
  return t("sellerSentOffer", { seller });
}

function offerPromoLine(
  offer: ShopOffer,
  t: ReturnType<typeof useTranslations<"offers">>,
) {
  const code = offer.promotion_code;
  if (offer.discount_percent != null && code) {
    return t("shopOfferPercentOffWithCode", {
      percent: offer.discount_percent,
      code,
    });
  }
  if (offer.discount_percent != null) {
    return t("shopOfferPercentOff", { percent: offer.discount_percent });
  }
  if (code) {
    return t("shopOfferCodeOnly", { code });
  }
  return t("shopOfferSpecial");
}

export function ShopOffersFeed({
  offers,
  productsById,
  basePath,
}: ShopOffersFeedProps) {
  const t = useTranslations("offers");
  const unseen = offers.filter((offer) => !offer.seen);
  const seen = offers.filter((offer) => offer.seen);
  const groups = [
    { key: "unseen", rows: unseen, showSeenBadge: false },
    {
      key: "seen",
      rows: seen,
      showSeenBadge: unseen.length > 0 && seen.length > 0,
    },
  ] as const;

  return (
    <div>
      {groups.map((group) =>
        group.rows.length ? (
          <div key={group.key}>
            {group.showSeenBadge ? (
              <div className="flex justify-center py-3">
                <span className="rounded-full bg-marketplace-surface-subtle px-3 py-0.5 text-[11px] font-medium text-marketplace-muted-foreground">
                  {t("seen")}
                </span>
              </div>
            ) : null}
            <ul className="divide-y divide-marketplace-border-subtle">
              {group.rows.map((offer) => {
                const product = offer.product_id
                  ? productsById.get(offer.product_id)
                  : undefined;
                const href = offer.product_id
                  ? `${basePath}/products/${offer.product_id}`
                  : `${basePath}/account/deals`;
                const unavailable = offer.expired || !offer.available;

                return (
                  <li key={offer.id}>
                    <Link
                      href={href}
                      className="block px-4 py-4 transition-colors hover:bg-marketplace-surface-warm focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-marketplace-brand"
                    >
                      <div className="flex gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Tag className="size-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <p className="min-w-0 flex-1 text-sm leading-5 text-marketplace-foreground">
                              {offerHeadline(offer, t)}
                            </p>
                            <span className="shrink-0 text-xs text-marketplace-muted-foreground">
                              {formatRelativeAge(String(offer.created_at))}
                            </span>
                          </div>

                          {product || offer.product_id ? (
                            <div className="relative mt-3 size-16 overflow-hidden rounded-md bg-marketplace-surface-subtle">
                              <ProductImage
                                src={product?.thumbnail_url}
                                alt={product?.name ?? ""}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                          ) : null}

                          <p className="mt-3 text-sm font-semibold text-emerald-700">
                            {offerPromoLine(offer, t)}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-marketplace-muted-foreground">
                            {unavailable
                              ? t("couponUnavailable")
                              : t("couponAvailable")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}
