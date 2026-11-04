"use client";

import { useTranslations } from "next-intl";
import { useFormatMoney } from "@/hooks/useFormatMoney";

interface BankTransferPaymentFormProps {
  /** What the buyer will pay: the cart's amount due, discount included. */
  amount: string;
  currency: string;
  expiryDays: number | null;
}

/**
 * What a buyer who chose bank transfer sees before placing the order.
 *
 * Deliberately no reference and no bank details: only a placed order matches
 * an incoming transfer automatically, so a buyer who paid now would make work
 * for a person. The confirmation page and the email show both.
 */
export function BankTransferPaymentForm({
  amount,
  currency,
  expiryDays,
}: BankTransferPaymentFormProps) {
  const t = useTranslations("checkout");
  const money = useFormatMoney();

  return (
    <div className="space-y-1.5 text-sm">
      <p className="font-medium text-gray-900">
        {t("bankTransferAmountDue", { amount: money(amount, currency) })}
      </p>
      <p className="text-gray-600">{t("bankTransferAfterOrder")}</p>
      {expiryDays ? (
        <p className="text-gray-500">
          {t("bankTransferWindow", { days: expiryDays })}
        </p>
      ) : null}
    </div>
  );
}
