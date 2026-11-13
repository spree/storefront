"use client";

import type { BuyerOffer, Product } from "@spree/sdk";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  Check,
  Clock3,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { BuyerOfferActions } from "@/components/account/BuyerOfferActions";
import { MessageSellerButton } from "@/components/account/MessageSellerButton";
import { EmptyStateIllustration } from "@/components/empty-states/EmptyStateIllustration";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { formatDate } from "@/lib/utils/format";

interface OffersListProps {
  offers: BuyerOffer[];
  products: Product[];
  popularProducts: Product[];
  basePath: string;
  locale: string;
}

type OfferFilter = "all" | "waiting" | "accepted" | "past";

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function getOfferFilter(status: string): Exclude<OfferFilter, "all"> {
  if (status === "accepted") return "accepted";
  if (status === "declined" || status === "expired" || status === "withdrawn") {
    return "past";
  }
  return "waiting";
}

function getStatusStyle(status: string) {
  if (status === "accepted") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-700/10";
  }
  if (status === "awaiting_buyer") {
    return "bg-orange-50 text-orange-900 ring-orange-700/15";
  }
  if (status === "declined" || status === "expired" || status === "withdrawn") {
    return "bg-stone-100 text-stone-600 ring-stone-700/10";
  }
  return "bg-sky-50 text-sky-900 ring-sky-700/10";
}

export function OffersList({
  offers,
  products,
  popularProducts,
  basePath,
  locale,
}: OffersListProps) {
  const t = useTranslations("offers");
  const [filter, setFilter] = useState<OfferFilter>("all");
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const counts = useMemo(
    () => ({
      all: offers.length,
      waiting: offers.filter(
        (offer) => getOfferFilter(offer.status) === "waiting",
      ).length,
      accepted: offers.filter((offer) => offer.status === "accepted").length,
      past: offers.filter((offer) => getOfferFilter(offer.status) === "past")
        .length,
    }),
    [offers],
  );
  const visibleOffers = offers.filter(
    (offer) => filter === "all" || getOfferFilter(offer.status) === filter,
  );

  const filters: Array<{ id: OfferFilter; label: string }> = [
    { id: "all", label: t("filterAll") },
    { id: "waiting", label: t("filterWaiting") },
    { id: "accepted", label: t("filterAccepted") },
    { id: "past", label: t("filterPast") },
  ];

  return (
    <div className="bg-[#faf8f6] px-4 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {offers.length > 0 ? (
          <>
            <section
              aria-label={t("summary")}
              className="grid grid-cols-3 divide-x divide-[#e9e3df] border-y border-[#e9e3df] py-4 sm:py-5"
            >
              <SummaryStat
                label={t("summaryWaiting")}
                value={counts.waiting}
                icon={<Clock3 aria-hidden="true" className="size-4" />}
              />
              <SummaryStat
                label={t("summaryAccepted")}
                value={counts.accepted}
                icon={<Check aria-hidden="true" className="size-4" />}
              />
              <SummaryStat
                label={t("summaryTotal")}
                value={counts.all}
                icon={<Tag aria-hidden="true" className="size-4" />}
              />
            </section>

            <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8c5a37]">
                  {t("yourOffers")}
                </p>
                <h2 className="mt-1 font-display text-2xl text-[#302936]">
                  {t("title")}
                </h2>
              </div>
              <fieldset className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-[#e6dfda] bg-white p-1">
                <legend className="sr-only">{t("filterOffers")}</legend>
                {filters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={filter === item.id}
                    onClick={() => setFilter(item.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand-accent focus-visible:ring-offset-2 ${
                      filter === item.id
                        ? "bg-[#302936] font-medium text-white"
                        : "text-[#625a62] hover:bg-[#f4f0ed] hover:text-[#302936]"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`text-xs tabular-nums ${filter === item.id ? "text-white/75" : "text-[#827a81]"}`}
                    >
                      {counts[item.id]}
                    </span>
                  </button>
                ))}
              </fieldset>
            </div>

            {visibleOffers.length > 0 ? (
              <ul className="mt-4 divide-y divide-[#e9e3df] border-y border-[#e9e3df]">
                {visibleOffers.map((offer) => {
                  const product = productById.get(offer.product_id);
                  const productHref = product?.slug
                    ? `${basePath}/products/${product.slug}`
                    : `${basePath}/account/offers`;
                  const status = t(`status_${offer.status}`, {
                    defaultValue: offer.status,
                  });
                  const savings = Math.max(
                    0,
                    Math.round(
                      ((offer.list_amount - offer.offer_amount) /
                        Math.max(offer.list_amount, 1)) *
                        100,
                    ),
                  );

                  return (
                    <li key={offer.id} className="py-5 sm:py-6">
                      <article className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                        <Link
                          href={productHref}
                          className="relative aspect-square w-24 overflow-hidden rounded-lg bg-[#f0e9e2] ring-1 ring-black/5 transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand-accent sm:w-28"
                          aria-label={product?.name || t("offerForItem")}
                        >
                          <ProductImage
                            src={product?.thumbnail_url}
                            alt={product?.name || ""}
                            fill
                            sizes="112px"
                            className="object-cover"
                          />
                        </Link>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(offer.status)}`}
                            >
                              {offer.status === "accepted" ? (
                                <Check
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                              ) : offer.status === "awaiting_buyer" ? (
                                <ArrowDownRight
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                              ) : offer.status === "pending" ? (
                                <Clock3
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                              ) : (
                                <Tag aria-hidden="true" className="size-3.5" />
                              )}
                              {status}
                            </span>
                            <span className="text-xs text-[#746c73]">
                              {t("updated", {
                                date: formatDate(offer.updated_at, "-", locale),
                              })}
                            </span>
                          </div>
                          <Link
                            href={productHref}
                            className="mt-2 block max-w-2xl text-base font-semibold leading-snug text-[#302936] underline-offset-4 hover:underline"
                          >
                            {product?.name || t("offerForItem")}
                          </Link>
                          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-lg font-semibold tabular-nums text-[#302936]">
                              {formatMoney(
                                offer.offer_amount,
                                offer.currency,
                                locale,
                              )}
                            </span>
                            <span className="text-xs text-[#746c73]">
                              {t("offerAmount")}
                            </span>
                            <span className="ml-1 text-sm text-[#746c73] line-through decoration-[#aa9fa5]">
                              {formatMoney(
                                offer.list_amount,
                                offer.currency,
                                locale,
                              )}
                            </span>
                            {savings > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#e9f2de] px-1.5 py-0.5 text-xs font-medium text-[#45672f]">
                                <BadgePercent
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {t("percentOff", { percent: savings })}
                              </span>
                            )}
                          </div>
                          {offer.buyer_message && (
                            <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-5 text-[#625a62]">
                              “{offer.buyer_message}”
                            </p>
                          )}
                          {offer.status === "awaiting_buyer" && (
                            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#a64d1c]">
                              <ArrowDownRight
                                aria-hidden="true"
                                className="size-4"
                              />
                              {t("counterOfferPrompt")}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                          <BuyerOfferActions offer={offer} />
                          <Button
                            asChild
                            variant="outline"
                            className="rounded-full border-[#d9d1cc] bg-transparent px-4 hover:bg-[#f1ece8]"
                          >
                            <Link href={productHref}>
                              <ArrowUpRight
                                aria-hidden="true"
                                className="size-4"
                              />
                              {t("viewListing")}
                            </Link>
                          </Button>
                          <MessageSellerButton
                            offerId={offer.id}
                            basePath={basePath}
                          />
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-5 border-y border-[#e9e3df] py-10 text-center">
                <p className="font-display text-xl text-[#302936]">
                  {t("filterEmptyTitle")}
                </p>
                <p className="mt-2 text-sm text-[#746c73]">
                  {t("filterEmptyDescription")}
                </p>
              </div>
            )}
          </>
        ) : (
          <section className="grid gap-7 border-y border-[#e9e3df] py-9 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:py-10">
            <div className="flex justify-center sm:justify-start">
              <EmptyStateIllustration
                name="no-active-promotions"
                className="text-[#534952]"
                size={72}
              />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="font-display text-2xl text-[#302936]">
                {t("emptyTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#746c73] sm:mx-0">
                {t("emptyDescription")}
              </p>
            </div>
            <Button
              asChild
              className="w-full rounded-full bg-[#302936] px-6 text-white hover:bg-[#443a49] sm:w-auto"
            >
              <Link href={`${basePath}/products`}>{t("startShopping")}</Link>
            </Button>
          </section>
        )}

        <section className="mt-9 pb-3">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8c5a37]">
                {t("discover")}
              </p>
              <h2 className="mt-1 font-display text-xl text-[#302936]">
                {t("popularGifts")}
              </h2>
            </div>
          </div>
          {popularProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
              {popularProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  basePath={basePath}
                  density="rail"
                  showFavorite={false}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#746c73]">{t("popularGiftsEmpty")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-2 first:pl-0 last:pr-0 sm:gap-3 sm:px-5">
      <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#655a65] ring-1 ring-[#e9e3df] sm:flex">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums text-[#302936] sm:text-2xl">
          {value}
        </p>
        <p className="truncate text-[11px] leading-4 text-[#746c73] sm:text-xs">
          {label}
        </p>
      </div>
    </div>
  );
}
