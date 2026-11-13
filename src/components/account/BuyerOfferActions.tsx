"use client";

import type { BuyerOffer } from "@spree/sdk";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { completeBuyerOffer, withdrawBuyerOffer } from "@/lib/data/offers";

export function BuyerOfferActions({ offer }: { offer: BuyerOffer }) {
  const t = useTranslations("offers");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const deadline =
    typeof offer.buyer_accept_by === "string" ? offer.buyer_accept_by : null;
  useEffect(() => {
    if (!deadline || offer.status !== "awaiting_buyer") return;
    const update = () =>
      setRemaining(Math.max(0, Date.parse(deadline) - Date.now()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [deadline, offer.status]);

  function change(action: "accept" | "withdraw") {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await (action === "accept"
        ? completeBuyerOffer(offer.id)
        : withdrawBuyerOffer(offer.id));
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }
  const expired = remaining === 0;
  return (
    <div className="flex flex-col gap-2" data-buyer-offer-actions={offer.id}>
      {offer.status === "awaiting_buyer" ? (
        <>
          <p className="text-sm font-medium">
            {t("sellerPrice", {
              amount: new Intl.NumberFormat(locale, {
                style: "currency",
                currency: offer.currency,
              }).format(offer.final_amount ?? offer.offer_amount),
            })}
          </p>
          {deadline && remaining !== null ? (
            <time className="text-xs text-muted-foreground" dateTime={deadline}>
              {expired
                ? t("priceExpired")
                : t("timeRemaining", {
                    hours: Math.floor(remaining / 3600000),
                    minutes: Math.floor((remaining % 3600000) / 60000),
                  })}
            </time>
          ) : null}
          <Button
            type="button"
            disabled={pending || expired}
            onClick={() => change("accept")}
          >
            {t("completePurchase")}
          </Button>
        </>
      ) : null}
      {offer.status === "accepted" && offer.promotion_code ? (
        <p className="text-sm">
          {t("checkoutCode")}{" "}
          <code className="select-all font-semibold">
            {offer.promotion_code}
          </code>
        </p>
      ) : null}
      {offer.status === "pending" || offer.status === "awaiting_buyer" ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => change("withdraw")}
        >
          {t("withdrawOffer")}
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
