"use client";

import type { Product, ShopOffer } from "@spree/sdk";
import { Bell, ChevronDown, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ShopOffersNavBadge } from "@/components/account/ShopOffersNavBadge";
import { ShopOffersFeed } from "@/components/shop-offers/ShopOffersFeed";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getProductsByIds } from "@/lib/data/products";
import { getShopOffers, markShopOffersSeen } from "@/lib/data/shop-offers";

interface BuyerDealsMenuProps {
  basePath: string;
}

export function BuyerDealsMenu({ basePath }: BuyerDealsMenuProps) {
  const t = useTranslations("offers");
  const accountT = useTranslations("account");
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || loaded || loading) return;

    setLoading(true);
    try {
      const response = await getShopOffers({ limit: 12 });
      const rows = Array.isArray(response?.data) ? response.data : [];
      setOffers(rows);
      setLoaded(true);
      setLoading(false);

      const productIds = rows
        .map((offer) => offer.product_id)
        .filter((id): id is string => Boolean(id));
      if (productIds.length) {
        void getProductsByIds(productIds)
          .then((loaded) => setProducts(loaded))
          .catch((error) => {
            console.error("Failed to load shop offer products", error);
            setProducts([]);
          });
      }

      const unseenIds = rows
        .filter((offer) => !offer.seen)
        .map((offer) => offer.id);
      if (unseenIds.length) {
        void markShopOffersSeen(unseenIds).catch((error) => {
          console.error("Failed to mark shop offers seen", error);
        });
      }
    } catch (error) {
      console.error("Failed to load shop offers", error);
      setOffers([]);
      setProducts([]);
      setLoaded(true);
      setLoading(false);
    }
  }

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-header-hover-trigger="true"
          aria-label={t("deals")}
          className="relative flex h-9 w-9 items-center justify-center rounded-full px-0 text-marketplace-foreground transition-[background-color,color] duration-200 ease-out hover:bg-marketplace-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketplace-brand motion-reduce:transition-none sm:h-10 sm:w-auto sm:gap-0.5 sm:px-1"
        >
          <span className="relative flex size-7 items-center justify-center sm:size-8">
            <Bell className="size-5 sm:size-[1.35rem]" strokeWidth={1.9} />
            <span className="absolute -right-0.5 -top-0.5">
              <ShopOffersNavBadge />
            </span>
          </span>
          <ChevronDown className="hidden size-3 sm:block" aria-hidden="true" />
          <span aria-hidden="true" className="marketplace-header-hover-label">
            {t("deals")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[110] w-[min(22rem,calc(100vw-1rem))] overflow-hidden p-0"
      >
        <header className="border-b border-marketplace-border-subtle bg-marketplace-surface-subtle px-4 py-3">
          <h2 className="text-sm font-semibold text-marketplace-foreground">
            {t("deals")}
          </h2>
        </header>

        <div className="max-h-[min(65vh,32rem)] overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="space-y-3 p-4" role="status" aria-live="polite">
              <span className="sr-only">{accountT("loading")}</span>
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-24 animate-pulse rounded-sm bg-marketplace-surface-warm"
                />
              ))}
            </div>
          ) : offers.length ? (
            <ShopOffersFeed
              offers={offers}
              productsById={productsById}
              basePath={basePath}
            />
          ) : (
            <div className="px-5 py-8 text-center">
              <Tag
                className="mx-auto mb-2 size-5 text-marketplace-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-marketplace-foreground">
                {t("shopOffersEmptyTitle")}
              </p>
              <p className="mt-1 text-xs leading-5 text-marketplace-muted-foreground">
                {t("shopOffersEmptyDescription")}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
