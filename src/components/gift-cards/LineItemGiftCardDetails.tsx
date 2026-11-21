"use client";

import type { LineItem } from "@spree/sdk";
import { useTranslations } from "next-intl";

/**
 * Who a gift card line is for, and once the order is paid, the cards it
 * issued. Codes arrive masked: only the recipient's email carries them.
 */
export function LineItemGiftCardDetails({ item }: { item: LineItem }) {
  const t = useTranslations("products.giftCard");
  if (!item.gift_card) return null;

  const recipient = item.recipient;
  const giftCards = item.gift_cards ?? [];

  return (
    <div className="mt-1 space-y-1 text-xs text-gray-500">
      <p>
        {recipient
          ? t("forRecipient", { recipient: recipient.name || recipient.email })
          : t("forYou")}
      </p>
      {giftCards.map((giftCard) => (
        <p key={giftCard.id} className="font-mono">
          {giftCard.code}
        </p>
      ))}
    </div>
  );
}
