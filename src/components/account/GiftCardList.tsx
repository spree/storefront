"use client";

import type { GiftCard } from "@spree/sdk";
import { Check, ClipboardCopy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFormatMoney } from "@/hooks/useFormatMoney";
import { formatDate } from "@/lib/utils/format";

function getStateColor(state: string, expired: boolean): string {
  if (expired) return "bg-gray-100 text-gray-800";
  switch (state) {
    case "active":
      return "bg-green-100 text-green-800";
    case "partially_redeemed":
      return "bg-yellow-100 text-yellow-800";
    case "redeemed":
      return "bg-gray-100 text-gray-800";
    case "canceled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStateLabel(
  state: string,
  t: ReturnType<typeof useTranslations<"giftCards">>,
): string {
  switch (state) {
    case "active":
      return t("active");
    case "partially_redeemed":
      return t("partiallyUsed");
    case "redeemed":
      return t("fullyRedeemed");
    case "canceled":
      return t("canceled");
    case "expired":
      return t("expired");
    default:
      return state;
  }
}

function CopyButton({ code }: { code: string }) {
  const t = useTranslations("giftCards");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopied(true);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      title={t("copyCodeToClipboard")}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-600">{t("copied")}</span>
        </>
      ) : (
        <>
          <ClipboardCopy className="w-4 h-4" />
          <span>{t("copy")}</span>
        </>
      )}
    </Button>
  );
}

function GiftCardItem({ card }: { card: GiftCard }) {
  const t = useTranslations("giftCards");
  const locale = useLocale();
  const formatMoney = useFormatMoney();
  const usagePercentage =
    Number(card.amount) > 0
      ? Math.round((Number(card.amount_used) / Number(card.amount)) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold text-gray-900">
              {card.code}
            </span>
            <CopyButton code={card.code} />
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${getStateColor(card.status, card.expired)}`}
            >
              {getStateLabel(card.status, t)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {card.expires_at
              ? t("expiresOn", {
                  date: formatDate(card.expires_at, "-", locale),
                })
              : t("noExpiration")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {formatMoney(card.amount_remaining, card.currency)}
          </p>
          <p className="text-sm text-gray-500">{t("remaining")}</p>
        </div>
      </div>

      {/* Progress bar showing usage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">
            {t("usedAmount", {
              amount: formatMoney(card.amount_used, card.currency),
            })}
          </span>
          <span className="text-gray-600">
            {t("totalAmountWithValue", {
              amount: formatMoney(card.amount, card.currency),
            })}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-lg h-2">
          <div
            className={`h-2 rounded-lg transition-all ${
              usagePercentage >= 100 ? "bg-gray-400" : "bg-primary"
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {t("percentUsed", { percent: usagePercentage })}
        </p>
      </div>

      {/* Additional info */}
      {card.redeemed_at && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {t("fullyRedeemedOnDate", {
              date: formatDate(card.redeemed_at, "-", locale),
            })}
          </p>
        </div>
      )}
    </div>
  );
}

interface GiftCardListProps {
  cards: GiftCard[];
}

export function GiftCardList({ cards }: GiftCardListProps) {
  const t = useTranslations("giftCards");
  const activeCards = cards.filter((c) => c.active && !c.expired);
  const inactiveCards = cards.filter((c) => !c.active || c.expired);

  return (
    <>
      {/* Active Cards */}
      {activeCards.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("activeGiftCardsCount", { count: activeCards.length })}
          </h2>
          <div className="space-y-4">
            {activeCards.map((card) => (
              <GiftCardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Cards */}
      {inactiveCards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-500 mb-4">
            {t("expiredRedeemedCount", { count: inactiveCards.length })}
          </h2>
          <div className="space-y-4 opacity-75">
            {inactiveCards.map((card) => (
              <GiftCardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
